use crate::error::{AppError, AppResult};
use directories::ProjectDirs;
use std::path::PathBuf;

const QUALIFIER: &str = "com";
const ORGANIZATION: &str = "FloatingMemo";
const APPLICATION: &str = "FloatingMemo";

pub fn data_dir() -> AppResult<PathBuf> {
    let dirs = ProjectDirs::from(QUALIFIER, ORGANIZATION, APPLICATION)
        .ok_or(AppError::DataDirUnavailable)?;
    let dir = dirs.data_dir().to_path_buf();
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}

pub fn db_path() -> AppResult<PathBuf> {
    Ok(data_dir()?.join("notes.db"))
}

pub fn backups_dir() -> AppResult<PathBuf> {
    let dir = data_dir()?.join("backups");
    std::fs::create_dir_all(&dir)?;
    Ok(dir)
}
