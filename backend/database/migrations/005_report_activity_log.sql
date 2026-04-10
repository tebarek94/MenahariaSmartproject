-- Auto / manual activity rows: source, lifecycle status, short summary
ALTER TABLE reports
  ADD COLUMN source VARCHAR(32) NOT NULL DEFAULT 'manual' AFTER file_path,
  ADD COLUMN status VARCHAR(32) NOT NULL DEFAULT 'active' AFTER source,
  ADD COLUMN summary TEXT NULL AFTER status;
