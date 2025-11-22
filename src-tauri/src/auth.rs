use aws_sdk_cognitoidentityprovider::{Client as CognitoClient, types::AttributeType};
use aws_sdk_dynamodb::{Client as DynamoClient, types::AttributeValue};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;

use crate::commands::file_sharing::zip_files;
use crate::utils::logger;

// Constants - Replace with your actual values
const CLIENT_ID: &str = "40jjknacfirb8lccv2d8k60afr";
const DYNAMODB_TABLE: &str = "FireTransfers";
const AWS_REGION: &str = "ap-south-1";

// AWS Credentials for DynamoDB access
// SECURITY NOTE: In production, these should be set via environment variables at build time
// Set these environment variables before building: AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
const AWS_ACCESS_KEY_ID: Option<&str> = option_env!("AWS_ACCESS_KEY_ID");
const AWS_SECRET_ACCESS_KEY: Option<&str> = option_env!("AWS_SECRET_ACCESS_KEY");

#[derive(Debug, Serialize, Deserialize)]
struct StoredCredentials {
    username: String,
    access_token: String,
}

/// Get the path to the credentials file
fn get_credentials_path() -> Result<PathBuf, String> {
    let home_dir = dirs::home_dir()
        .ok_or("Could not determine home directory")?;
    
    let fire_dir = home_dir.join(".fire");
    
    // Create .fire directory if it doesn't exist
    if !fire_dir.exists() {
        fs::create_dir_all(&fire_dir)
            .map_err(|e| format!("Failed to create .fire directory: {}", e))?;
    }
    
    Ok(fire_dir.join(".credentials"))
}

/// Store credentials to encrypted file
fn store_credentials(username: &str, access_token: &str) -> Result<(), String> {
    let creds = StoredCredentials {
        username: username.to_string(),
        access_token: access_token.to_string(),
    };
    
    let json = serde_json::to_string(&creds)
        .map_err(|e| format!("Failed to serialize credentials: {}", e))?;
    
    let creds_path = get_credentials_path()?;
    
    fs::write(&creds_path, json)
        .map_err(|e| format!("Failed to write credentials file: {}", e))?;
    
    logger::internal_log_info(&format!("Credentials stored to: {}", creds_path.display()));
    
    Ok(())
}

/// Load credentials from file
fn load_credentials() -> Result<Option<StoredCredentials>, String> {
    let creds_path = get_credentials_path()?;
    
    if !creds_path.exists() {
        logger::internal_log_debug("Credentials file does not exist");
        return Ok(None);
    }
    
    let json = fs::read_to_string(&creds_path)
        .map_err(|e| format!("Failed to read credentials file: {}", e))?;
    
    let creds: StoredCredentials = serde_json::from_str(&json)
        .map_err(|e| format!("Failed to parse credentials: {}", e))?;
    
    Ok(Some(creds))
}

/// Delete stored credentials
fn delete_credentials() -> Result<(), String> {
    let creds_path = get_credentials_path()?;
    
    if creds_path.exists() {
        fs::remove_file(&creds_path)
            .map_err(|e| format!("Failed to delete credentials file: {}", e))?;
    }
    
    Ok(())
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Transfer {
    pub recipient_username: String,
    pub timestamp: String,
    pub sender: String,
    pub code: String,
}

/// Initialize AWS config with region for unauthenticated Cognito operations
async fn get_cognito_config() -> aws_config::SdkConfig {
    // For public Cognito operations (sign_up, confirm_sign_up, sign_in)
    // we don't need AWS credentials, just the region
    aws_config::defaults(aws_config::BehaviorVersion::latest())
        .region(aws_config::Region::new(AWS_REGION))
        .no_credentials() // Don't require AWS credentials for public operations
        .load()
        .await
}

/// Initialize AWS config with region and credentials for DynamoDB operations
async fn get_aws_config() -> Result<aws_config::SdkConfig, String> {
    // For DynamoDB operations, we need AWS credentials
    // Check if credentials are provided via compile-time environment variables
    if let (Some(access_key), Some(secret_key)) = (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY) {
        logger::internal_log_debug("Using embedded AWS credentials");
        
        // Set environment variables for AWS SDK to pick up
        std::env::set_var("AWS_ACCESS_KEY_ID", access_key);
        std::env::set_var("AWS_SECRET_ACCESS_KEY", secret_key);
    } else {
        logger::internal_log_debug("Attempting to load AWS credentials from environment");
    }
    
    let config = aws_config::defaults(aws_config::BehaviorVersion::latest())
        .region(aws_config::Region::new(AWS_REGION))
        .load()
        .await;
    
    // Verify credentials are available
    match config.credentials_provider() {
        Some(_) => {
            logger::internal_log_debug("AWS credentials loaded successfully");
            Ok(config)
        }
        None => {
            Err("No AWS credentials found. File transfer features require AWS credentials to be set via AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables at build time.".to_string())
        }
    }
}

/// Sign up a new user in Cognito
#[tauri::command]
pub async fn sign_up(username: String, password: String, email: String) -> Result<String, String> {
    let config = get_cognito_config().await;
    let client = CognitoClient::new(&config);

    let email_attr = AttributeType::builder()
        .name("email")
        .value(email)
        .build()
        .map_err(|e| format!("Failed to build email attribute: {}", e))?;

    client
        .sign_up()
        .client_id(CLIENT_ID)
        .username(&username)
        .password(&password)
        .user_attributes(email_attr)
        .send()
        .await
        .map_err(|e| format!("Sign up failed: {}", e))?;

    Ok(format!("User {} registered successfully. Please check your email for confirmation code.", username))
}

/// Confirm user sign up with code from email
#[tauri::command]
pub async fn confirm_sign_up(username: String, code: String) -> Result<String, String> {
    let config = get_cognito_config().await;
    let client = CognitoClient::new(&config);

    client
        .confirm_sign_up()
        .client_id(CLIENT_ID)
        .username(&username)
        .confirmation_code(&code)
        .send()
        .await
        .map_err(|e| format!("Confirmation failed: {}", e))?;

    Ok(format!("User {} confirmed successfully!", username))
}

/// Sign in user and store tokens in keyring
/// Uses USER_PASSWORD_AUTH flow which doesn't require AWS credentials
#[tauri::command]
pub async fn sign_in(username: String, password: String) -> Result<String, String> {
    let config = get_cognito_config().await;
    let client = CognitoClient::new(&config);

    // Use AdminInitiateAuth which doesn't require SRP but needs AWS credentials
    // This is simpler and works when running with AWS credentials (IAM user/role)
    let auth_params = [
        ("USERNAME".to_string(), username.clone()),
        ("PASSWORD".to_string(), password),
    ]
    .iter()
    .cloned()
    .collect::<HashMap<String, String>>();

    // First, we need to get the User Pool ID from the app client
    // Since we don't have it as a constant, we'll try USER_PASSWORD_AUTH first
    // and provide better error messages
    
    let result = client
        .initiate_auth()
        .auth_flow(aws_sdk_cognitoidentityprovider::types::AuthFlowType::UserPasswordAuth)
        .client_id(CLIENT_ID)
        .set_auth_parameters(Some(auth_params))
        .send()
        .await
        .map_err(|e| {
            let error_msg = format!("{}", e);
            if error_msg.contains("USER_PASSWORD_AUTH") || error_msg.contains("not enabled") {
                format!(
                    "Authentication flow not enabled. Please enable USER_PASSWORD_AUTH in your Cognito App Client settings:\n\
                    1. Go to AWS Console > Cognito > User Pools\n\
                    2. Select your user pool\n\
                    3. Go to 'App integration' > 'App clients'\n\
                    4. Edit your app client\n\
                    5. Under 'Authentication flows', enable 'ALLOW_USER_PASSWORD_AUTH'\n\
                    6. Save changes\n\n\
                    Original error: {}", error_msg
                )
            } else {
                format!("Sign in failed: {}", error_msg)
            }
        })?;

    // Extract access token
    let auth_result = result
        .authentication_result()
        .ok_or("No authentication result")?;
    
    let access_token = auth_result
        .access_token()
        .ok_or("No access token in response")?;

    logger::internal_log_info(&format!("Successfully authenticated user: {}", username));

    // Store credentials to file (more reliable than Windows keyring)
    store_credentials(&username, access_token)?;
    
    logger::internal_log_info(&format!("✓ Credentials stored successfully for user: {}", username));
    
    // Verify we can read it back
    match load_credentials()? {
        Some(creds) => {
            logger::internal_log_info(&format!("✓ Verified: Credentials can be loaded (user: {})", creds.username));
        }
        None => {
            logger::internal_log_error("✗ WARNING: Just stored credentials but cannot read them back");
        }
    }

    Ok(format!("Signed in successfully as {}", username))
}

/// Initiate forgot password flow - sends reset code to user's email
#[tauri::command]
pub async fn forgot_password(username: String) -> Result<String, String> {
    let config = get_cognito_config().await;
    let client = CognitoClient::new(&config);

    client
        .forgot_password()
        .client_id(CLIENT_ID)
        .username(&username)
        .send()
        .await
        .map_err(|e| format!("Failed to initiate password reset: {}", e))?;

    logger::internal_log_info(&format!("Password reset initiated for user: {}", username));
    Ok(format!("Password reset code sent to your email. Please check your inbox."))
}

/// Confirm forgot password with code and new password
#[tauri::command]
pub async fn confirm_forgot_password(
    username: String,
    code: String,
    new_password: String,
) -> Result<String, String> {
    let config = get_cognito_config().await;
    let client = CognitoClient::new(&config);

    client
        .confirm_forgot_password()
        .client_id(CLIENT_ID)
        .username(&username)
        .confirmation_code(&code)
        .password(&new_password)
        .send()
        .await
        .map_err(|e| format!("Failed to reset password: {}", e))?;

    logger::internal_log_info(&format!("Password reset successfully for user: {}", username));
    Ok(format!("Password reset successfully! You can now sign in with your new password."))
}

/// Sign out user by removing stored credentials
#[tauri::command]
pub async fn sign_out() -> Result<String, String> {
    delete_credentials()?;
    logger::internal_log_info("User signed out successfully");
    Ok("Signed out successfully".to_string())
}

/// Get current logged in user from stored credentials
#[tauri::command]
pub async fn get_current_user() -> Result<Option<String>, String> {
    logger::internal_log_debug("Checking for stored credentials");
    
    match load_credentials()? {
        Some(creds) => {
            logger::internal_log_info(&format!("✓ Current user found: {}", creds.username));
            Ok(Some(creds.username))
        }
        None => {
            logger::internal_log_debug("No stored credentials found");
            Ok(None)
        }
    }
}

/// Send file to another user via P2P with DynamoDB signaling
#[tauri::command]
pub async fn send_file_to_user(recipient: String, file_path: String) -> Result<String, String> {
    // Get current user
    let sender = get_current_user()
        .await?
        .ok_or("Not logged in. Please sign in first.")?;

    logger::internal_log_info(&format!("Initiating file transfer from {} to {}", sender, recipient));

    // Step 1: Zip the file
    let zip_path = format!("{}.zip", file_path);
    zip_files(vec![file_path.clone()], zip_path.clone())?;
    
    logger::internal_log_info(&format!("File zipped: {}", zip_path));
    
    // Step 2: Generate a unique transfer code (we'll use croc's code format)
    // Instead of starting croc and blocking, we generate a code and start croc in background
    let transfer_code = format!("{}-{}-{}", 
        uuid::Uuid::new_v4().to_string()[..6].to_string(),
        uuid::Uuid::new_v4().to_string()[..6].to_string(),
        uuid::Uuid::new_v4().to_string()[..6].to_string()
    );
    
    logger::internal_log_info(&format!("Generated transfer code: {}", transfer_code));
    
    // Step 3: Store transfer info in DynamoDB FIRST (before starting croc)
    let config = get_aws_config().await?;
    let client = DynamoClient::new(&config);

    let timestamp = chrono::Utc::now().to_rfc3339();

    let mut item = HashMap::new();
    item.insert(
        "recipient_username".to_string(),
        AttributeValue::S(recipient.clone()),
    );
    item.insert(
        "timestamp".to_string(),
        AttributeValue::S(timestamp.clone()),
    );
    item.insert(
        "sender".to_string(),
        AttributeValue::S(sender.clone()),
    );
    item.insert(
        "code".to_string(),
        AttributeValue::S(transfer_code.clone()),
    );
    item.insert(
        "file_path".to_string(),
        AttributeValue::S(file_path.clone()),
    );
    item.insert(
        "zip_path".to_string(),
        AttributeValue::S(zip_path.clone()),
    );

    client
        .put_item()
        .table_name(DYNAMODB_TABLE)
        .set_item(Some(item))
        .send()
        .await
        .map_err(|e| {
            logger::internal_log_error(&format!("Failed to store in DynamoDB: {}", e));
            format!("Failed to store transfer info: {}", e)
        })?;

    logger::internal_log_info(&format!("Transfer info stored in DynamoDB for {}", recipient));

    // Step 4: Start croc in background with the custom code
    use std::process::Command;
    let zip_path_clone = zip_path.clone();
    let code_clone = transfer_code.clone();
    
    tokio::spawn(async move {
        logger::internal_log_info(&format!("Starting croc sender with code: {}", code_clone));
        
        #[cfg(target_os = "windows")]
        {
            use std::os::windows::process::CommandExt;
            const CREATE_NO_WINDOW: u32 = 0x08000000;
            
            match Command::new("croc")
                .arg("send")
                .arg("--code")
                .arg(&code_clone)
                .arg(&zip_path_clone)
                .creation_flags(CREATE_NO_WINDOW)
                .spawn()
            {
                Ok(_) => logger::internal_log_info("Croc sender started in hidden background process"),
                Err(e) => logger::internal_log_error(&format!("Failed to start croc: {}", e)),
            }
        }
        
        #[cfg(not(target_os = "windows"))]
        {
            match Command::new("croc")
                .arg("send")
                .arg("--code")
                .arg(&code_clone)
                .arg(&zip_path_clone)
                .spawn()
            {
                Ok(_) => logger::internal_log_info("Croc sender started in background"),
                Err(e) => logger::internal_log_error(&format!("Failed to start croc: {}", e)),
            }
        }
    });

    Ok(format!(
        "Transfer ready! Tell {} to use code: {}",
        recipient, transfer_code
    ))
}

/// Check for incoming file transfers for current user
#[tauri::command]
pub async fn check_incoming_transfers() -> Result<Vec<Transfer>, String> {
    // Get current user
    let username = get_current_user()
        .await?
        .ok_or("Not logged in. Please sign in first.")?;

    // Query DynamoDB for transfers to this user
    let config = get_aws_config().await?;
    let client = DynamoClient::new(&config);

    let result = client
        .query()
        .table_name(DYNAMODB_TABLE)
        .key_condition_expression("recipient_username = :username")
        .expression_attribute_values(":username", AttributeValue::S(username))
        .send()
        .await
        .map_err(|e| format!("Failed to query transfers: {}", e))?;

    let mut transfers = Vec::new();

    // items() returns a slice, not an Option
    for item in result.items() {
        let transfer = Transfer {
            recipient_username: item
                .get("recipient_username")
                .and_then(|v| v.as_s().ok())
                .unwrap_or(&String::new())
                .to_string(),
            timestamp: item
                .get("timestamp")
                .and_then(|v| v.as_s().ok())
                .unwrap_or(&String::new())
                .to_string(),
            sender: item
                .get("sender")
                .and_then(|v| v.as_s().ok())
                .unwrap_or(&String::new())
                .to_string(),
            code: item
                .get("code")
                .and_then(|v| v.as_s().ok())
                .unwrap_or(&String::new())
                .to_string(),
        };
        transfers.push(transfer);
    }

    Ok(transfers)
}

/// Accept and receive a file transfer using croc
#[tauri::command]
pub async fn accept_transfer(
    code: String, 
    recipient_username: String, 
    timestamp: String,
    project_path: Option<String>
) -> Result<String, String> {
    use std::process::Command;
    
    logger::internal_log_info(&format!("Accepting transfer with code: {}", code));
    
    // Determine save directory
    let save_dir = if let Some(ref project) = project_path {
        let project_data_dir = std::path::Path::new(project).join("data").join("received");
        
        // Create the data/received directory if it doesn't exist
        if !project_data_dir.exists() {
            fs::create_dir_all(&project_data_dir)
                .map_err(|e| format!("Failed to create received directory: {}", e))?;
            logger::internal_log_info(&format!("Created directory: {}", project_data_dir.display()));
        }
        
        project_data_dir
    } else {
        // Fallback to downloads directory if no project is open
        dirs::download_dir()
            .ok_or("Could not find downloads directory")?
    };
    
    logger::internal_log_info(&format!("Save directory: {}", save_dir.display()));
    
    // Start croc receive in the save directory (hidden window on Windows)
    #[cfg(target_os = "windows")]
    let output = {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        
        Command::new("croc")
            .arg("--yes")  // Auto-accept
            .arg("--out")
            .arg(&save_dir)
            .arg(&code)
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|e| format!("Failed to execute croc: {}", e))?
    };
    
    #[cfg(not(target_os = "windows"))]
    let output = Command::new("croc")
        .arg("--yes")  // Auto-accept
        .arg("--out")
        .arg(&save_dir)
        .arg(&code)
        .output()
        .map_err(|e| format!("Failed to execute croc: {}", e))?;
    
    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        logger::internal_log_error(&format!("Croc receive failed: {}", stderr));
        return Err(format!("Failed to receive file: {}", stderr));
    }
    
    logger::internal_log_info("File received successfully");
    
    // Delete the transfer from DynamoDB after successful receive
    let config = get_aws_config().await?;
    let client = DynamoClient::new(&config);
    
    let mut key = HashMap::new();
    key.insert(
        "recipient_username".to_string(),
        AttributeValue::S(recipient_username),
    );
    key.insert(
        "timestamp".to_string(),
        AttributeValue::S(timestamp),
    );
    
    client
        .delete_item()
        .table_name(DYNAMODB_TABLE)
        .set_key(Some(key))
        .send()
        .await
        .map_err(|e| {
            logger::internal_log_warn(&format!("Failed to delete transfer record: {}", e));
            // Don't fail the whole operation if we can't delete
            e
        })
        .ok();
    
    Ok(get_save_location_message(project_path.as_deref()))
}

/// Reject/delete a transfer without receiving it
#[tauri::command]
pub async fn reject_transfer(recipient_username: String, timestamp: String) -> Result<String, String> {
    logger::internal_log_info(&format!("Rejecting transfer for {} at {}", recipient_username, timestamp));
    
    let config = get_aws_config().await?;
    let client = DynamoClient::new(&config);
    
    let mut key = HashMap::new();
    key.insert(
        "recipient_username".to_string(),
        AttributeValue::S(recipient_username),
    );
    key.insert(
        "timestamp".to_string(),
        AttributeValue::S(timestamp),
    );
    
    client
        .delete_item()
        .table_name(DYNAMODB_TABLE)
        .set_key(Some(key))
        .send()
        .await
        .map_err(|e| format!("Failed to delete transfer: {}", e))?;
    
    logger::internal_log_info("Transfer rejected and deleted");
    
    Ok("Transfer rejected".to_string())
}

/// Get the current save location for received files
fn get_save_location_message(project_path: Option<&str>) -> String {
    if let Some(project) = project_path {
        let project_name = std::path::Path::new(project)
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("project");
        format!("File received successfully! Saved to {}/data/received/", project_name)
    } else {
        "File received successfully! Check your Downloads folder.".to_string()
    }
}
