// Module declarations
pub mod data;
pub mod filesystem;
pub mod global_settings;
pub mod projects;
pub mod server;
pub mod settings;
pub mod state;
pub mod window;
pub mod workspace;

// Re-export AppState for convenience
pub use state::AppState;

// Re-export all command functions
pub use data::*;
pub use filesystem::*;
pub use global_settings::*;
pub use projects::*;
pub use server::*;
pub use settings::*;
pub use window::*;
pub use workspace::*;
