-- portfolio_shares_schema.sql
-- Table to track which student portfolios have been shared with parents

CREATE TABLE IF NOT EXISTS portfolio_shares (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    shared_by TEXT NOT NULL REFERENCES profiles(id),
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_shared BOOLEAN DEFAULT TRUE,
    teacher_message TEXT,
    UNIQUE(student_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_portfolio_shares_student_id ON portfolio_shares(student_id);
