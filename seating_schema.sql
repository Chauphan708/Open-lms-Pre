-- Bảng lưu trữ sơ đồ lớp học
CREATE TABLE public.class_seating_charts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    class_id TEXT NOT NULL REFERENCES public.classes(id) ON DELETE CASCADE,
    rows INTEGER NOT NULL DEFAULT 5,
    columns INTEGER NOT NULL DEFAULT 5,
    seats JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of { row, col, studentId }
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(class_id)
);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_class_seating_charts_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_class_seating_charts_updated_at
BEFORE UPDATE ON public.class_seating_charts
FOR EACH ROW
EXECUTE FUNCTION update_class_seating_charts_modtime();

-- RLS (Row Level Security) 
ALTER TABLE public.class_seating_charts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all read access" ON public.class_seating_charts;
DROP POLICY IF EXISTS "Allow all insert access" ON public.class_seating_charts;
DROP POLICY IF EXISTS "Allow all update access" ON public.class_seating_charts;
DROP POLICY IF EXISTS "Allow all delete access" ON public.class_seating_charts;

CREATE POLICY "Authenticated read access" ON public.class_seating_charts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Teacher full access" ON public.class_seating_charts FOR ALL TO authenticated USING (true) WITH CHECK (true);
