// Module declarations
pub mod data;
pub mod file_sharing;
pub mod filesystem;
pub mod flux;
pub mod global_settings;
pub mod projects;
pub mod server;
pub mod settings;
pub mod state;
pub mod system;
pub mod window;
pub mod workspace;

// Re-export AppState for convenience
pub use state::AppState;

// Re-export all command functions
pub use data::*;
pub use file_sharing::*;
pub use filesystem::*;
pub use global_settings::*;
pub use projects::*;
pub use server::*;
pub use settings::*;
pub use system::*;
pub use window::*;
pub use workspace::*;
