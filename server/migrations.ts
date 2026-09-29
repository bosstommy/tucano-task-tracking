// Migrazioni incrementali: ogni voce porta il DB alla versione successiva (PRAGMA user_version).
export const migrations: string[] = [
  `
  CREATE TABLE statuses (
    id        INTEGER PRIMARY KEY,
    name      TEXT    NOT NULL,
    color     TEXT    NOT NULL,
    kind      TEXT    NOT NULL CHECK (kind IN ('todo','doing','waiting','done')),
    position  REAL    NOT NULL DEFAULT 0
  );

  CREATE TABLE tasks (
    id              INTEGER PRIMARY KEY,
    parent_id       INTEGER REFERENCES tasks(id) ON DELETE CASCADE,
    title           TEXT    NOT NULL,
    description     TEXT    NOT NULL DEFAULT '',
    status_id       INTEGER NOT NULL REFERENCES statuses(id),
    urgent          INTEGER NOT NULL DEFAULT 0,
    important       INTEGER NOT NULL DEFAULT 0,
    on_fire         INTEGER NOT NULL DEFAULT 0,
    start_date      TEXT,
    end_date        TEXT,
    end_date_manual INTEGER NOT NULL DEFAULT 0,
    due_date        TEXT,
    estimate_days   REAL,
    position        REAL    NOT NULL DEFAULT 0,
    created_at      TEXT    NOT NULL,
    updated_at      TEXT    NOT NULL,
    deleted_at      TEXT
  );
  CREATE INDEX idx_tasks_parent ON tasks(parent_id);

  CREATE TABLE tags (
    id    INTEGER PRIMARY KEY,
    name  TEXT NOT NULL UNIQUE COLLATE NOCASE,
    color TEXT NOT NULL
  );

  CREATE TABLE task_tags (
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
  );

  CREATE TABLE notes (
    id         INTEGER PRIMARY KEY,
    task_id    INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    kind       TEXT    NOT NULL DEFAULT 'text' CHECK (kind IN ('text','voice')),
    content    TEXT    NOT NULL,
    created_at TEXT    NOT NULL
  );
  CREATE INDEX idx_notes_task ON notes(task_id);

  CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );

  INSERT INTO statuses (name, color, kind, position) VALUES
    ('Da fare',   '#A39A90', 'todo',    1),
    ('In corso',  '#3BB3A9', 'doing',   2),
    ('In attesa', '#F2C14E', 'waiting', 3),
    ('Fatto',     '#6BAA75', 'done',    4);
  `,
  `
  CREATE TABLE contacts (
    id    INTEGER PRIMARY KEY,
    name  TEXT NOT NULL UNIQUE COLLATE NOCASE,
    color TEXT NOT NULL,
    kind  TEXT NOT NULL DEFAULT 'persona' CHECK (kind IN ('persona','ufficio','cliente','fornitore'))
  );

  CREATE TABLE waits (
    id          INTEGER PRIMARY KEY,
    task_id     INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    contact_id  INTEGER REFERENCES contacts(id) ON DELETE SET NULL,
    what        TEXT    NOT NULL DEFAULT '',
    asked_on    TEXT    NOT NULL,
    expect_by   TEXT,
    followup_on TEXT,
    followups   INTEGER NOT NULL DEFAULT 0,
    resolved_on TEXT,
    outcome     TEXT    NOT NULL DEFAULT ''
  );
  CREATE INDEX idx_waits_task ON waits(task_id);

  CREATE TABLE events (
    id      INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    type    TEXT NOT NULL,
    text    TEXT NOT NULL,
    at      TEXT NOT NULL
  );
  CREATE INDEX idx_events_task ON events(task_id);

  ALTER TABLE tasks ADD COLUMN is_flow INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE tasks ADD COLUMN owner_contact_id INTEGER REFERENCES contacts(id) ON DELETE SET NULL;

  CREATE TABLE flow_templates (
    id    INTEGER PRIMARY KEY,
    name  TEXT NOT NULL,
    steps TEXT NOT NULL
  );

  INSERT INTO flow_templates (name, steps) VALUES ('Richiesta documenti cliente', '[
    {"title":"Richiesta ricevuta e compresa","owner":null,"estimate_days":null},
    {"title":"Valutazione prodotti","owner":"Commerciale","estimate_days":null},
    {"title":"Valutazione pesi prodotti","owner":null,"estimate_days":1},
    {"title":"Preparazione documenti","owner":null,"estimate_days":1},
    {"title":"Invio al cliente","owner":null,"estimate_days":null},
    {"title":"Conferma ricezione","owner":"Cliente","estimate_days":null}
  ]');
  `,
  `
  ALTER TABLE tasks ADD COLUMN ball_out INTEGER NOT NULL DEFAULT 0;
  ALTER TABLE tasks ADD COLUMN ball_since TEXT;

  -- Le attese aperte diventano "palla nel campo degli altri".
  UPDATE tasks SET ball_out = 1,
    ball_since = (SELECT min(asked_on) FROM waits w WHERE w.task_id = tasks.id AND w.resolved_on IS NULL)
  WHERE id IN (SELECT task_id FROM waits WHERE resolved_on IS NULL);

  -- Le tappe affidate a qualcun altro restano "degli altri".
  UPDATE tasks SET ball_out = 1 WHERE owner_contact_id IS NOT NULL;

  UPDATE flow_templates SET steps = replace(replace(steps, '"owner":null', '"others":false'), '"owner":"', '"others":true,"was":"');
  `,
  `
  ALTER TABLE tasks ADD COLUMN remind_days INTEGER;

  -- Le sottoattività diventano semplici voci spuntabili: la palla è solo della card madre.
  -- Se la tappa corrente di un flusso era "agli altri", la palla passa al flusso.
  UPDATE tasks AS p SET ball_out = 1, ball_since = (
    SELECT s.ball_since FROM tasks s
    WHERE s.parent_id = p.id AND s.deleted_at IS NULL
      AND s.status_id NOT IN (SELECT id FROM statuses WHERE kind = 'done')
    ORDER BY s.position LIMIT 1)
  WHERE p.is_flow = 1 AND p.ball_out = 0 AND (
    SELECT s.ball_out FROM tasks s
    WHERE s.parent_id = p.id AND s.deleted_at IS NULL
      AND s.status_id NOT IN (SELECT id FROM statuses WHERE kind = 'done')
    ORDER BY s.position LIMIT 1) = 1;
  UPDATE tasks SET ball_out = 0, ball_since = NULL WHERE parent_id IS NOT NULL;
  `,
  `
  -- Stati semplificati: In corso (predefinito) · Backlog (idee) · Fatto. "In fiamme" resta il flag.
  UPDATE tasks SET status_id = (SELECT id FROM statuses WHERE kind = 'doing' ORDER BY position LIMIT 1)
  WHERE status_id IN (SELECT id FROM statuses WHERE kind IN ('todo', 'waiting'))
    AND EXISTS (SELECT 1 FROM statuses WHERE kind = 'doing');
  DELETE FROM statuses WHERE kind = 'waiting' AND EXISTS (SELECT 1 FROM statuses WHERE kind = 'doing')
    AND id NOT IN (SELECT status_id FROM tasks);
  UPDATE statuses SET name = 'Backlog (idee)', color = '#A39A90'
  WHERE id = (SELECT id FROM statuses WHERE kind = 'todo' ORDER BY position LIMIT 1);
  UPDATE statuses SET position = 0 WHERE kind = 'todo';
  `,
  `
  CREATE TABLE inbox (
    id         INTEGER PRIMARY KEY,
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  `,
]
