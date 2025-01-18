-- TABLE creation
CREATE TABLE IF NOT EXISTS masters (
    id UUID PRIMARY KEY,
    full_name VARCHAR(200) NOT NULL,
    assigned_requests UUID[] DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS requests (
    id UUID PRIMARY KEY,
    address VARCHAR(255) NOT NULL,
    complexity INTEGER NOT NULL CHECK (complexity > 0),
    master_id UUID REFERENCES masters ON DELETE SET NULL
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'manager') THEN
        CREATE ROLE manager LOGIN ENCRYPTED PASSWORD 'admin';
    END IF;
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON masters, requests TO manager;

CREATE OR REPLACE FUNCTION validate_request_assignment()
RETURNS TRIGGER AS $$
DECLARE
    total_complexity INTEGER;
    complexity_limit INTEGER := 100;
BEGIN
    SELECT COALESCE(SUM(complexity), 0)
    INTO total_complexity
    FROM requests
    WHERE master_id = NEW.master_id AND id <> NEW.id;

    total_complexity := total_complexity + NEW.complexity;

    IF total_complexity > complexity_limit THEN
        RAISE EXCEPTION 'Достигнут предел сложности для мастера %', NEW.master_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_complexity_limit
BEFORE INSERT OR UPDATE ON requests
FOR EACH ROW
EXECUTE FUNCTION validate_request_assignment();

CREATE OR REPLACE FUNCTION update_assigned_requests()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE masters
        SET assigned_requests = array_append(assigned_requests, NEW.id)
        WHERE id = NEW.master_id;
    ELSIF TG_OP = 'UPDATE' THEN
        UPDATE masters
        SET assigned_requests = array_remove(assigned_requests, OLD.id)
        WHERE id = OLD.master_id;

        UPDATE masters
        SET assigned_requests = array_append(assigned_requests, NEW.id)
        WHERE id = NEW.master_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE masters
        SET assigned_requests = array_remove(assigned_requests, OLD.id)
        WHERE id = OLD.master_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_assigned_requests_trigger
AFTER INSERT OR UPDATE OR DELETE ON requests
FOR EACH ROW
EXECUTE FUNCTION update_assigned_requests();
