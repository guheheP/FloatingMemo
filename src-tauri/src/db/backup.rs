use crate::error::AppResult;
use std::path::Path;

const KEEP_BACKUPS: usize = 5;

pub fn rotate_and_backup(src_db: &Path, backups_dir: &Path) -> AppResult<()> {
    if !src_db.exists() {
        return Ok(());
    }
    let stamp = chrono::Utc::now().timestamp_millis();
    let target = backups_dir.join(format!("notes-{stamp}.db"));
    std::fs::copy(src_db, &target)?;
    prune_old(backups_dir, KEEP_BACKUPS)?;
    Ok(())
}

fn prune_old(dir: &Path, keep: usize) -> AppResult<()> {
    let mut entries: Vec<(std::time::SystemTime, std::path::PathBuf)> = std::fs::read_dir(dir)?
        .filter_map(Result::ok)
        .filter_map(|e| {
            let path = e.path();
            let name = path.file_name()?.to_string_lossy().to_string();
            if !name.starts_with("notes-") || !name.ends_with(".db") {
                return None;
            }
            let modified = e.metadata().ok()?.modified().ok()?;
            Some((modified, path))
        })
        .collect();
    entries.sort_by(|a, b| b.0.cmp(&a.0));
    for (_, path) in entries.into_iter().skip(keep) {
        let _ = std::fs::remove_file(path);
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    #[test]
    fn rotates_and_keeps_only_last_five() {
        let dir = tempdir().unwrap();
        let src = dir.path().join("notes.db");
        std::fs::write(&src, b"some bytes").unwrap();
        let backups = dir.path().join("backups");
        std::fs::create_dir_all(&backups).unwrap();

        for _ in 0..7 {
            rotate_and_backup(&src, &backups).unwrap();
            std::thread::sleep(std::time::Duration::from_millis(5));
        }

        let count = std::fs::read_dir(&backups)
            .unwrap()
            .filter(|e| {
                e.as_ref()
                    .map(|e| e.file_name().to_string_lossy().starts_with("notes-"))
                    .unwrap_or(false)
            })
            .count();
        assert_eq!(count, KEEP_BACKUPS);
    }

    #[test]
    fn missing_source_is_noop() {
        let dir = tempdir().unwrap();
        let src = dir.path().join("missing.db");
        let backups = dir.path().join("backups");
        std::fs::create_dir_all(&backups).unwrap();
        rotate_and_backup(&src, &backups).unwrap();
        let count = std::fs::read_dir(&backups).unwrap().count();
        assert_eq!(count, 0);
    }
}
