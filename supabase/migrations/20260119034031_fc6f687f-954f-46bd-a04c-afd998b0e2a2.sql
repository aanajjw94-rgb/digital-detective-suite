-- Create cases table for forensic cases
CREATE TABLE public.cases (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    case_number TEXT NOT NULL UNIQUE,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed', 'archived')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    investigator_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reports table for forensic reports
CREATE TABLE public.reports (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    case_id UUID REFERENCES public.cases(id) ON DELETE CASCADE,
    tool_name TEXT NOT NULL,
    report_type TEXT NOT NULL,
    report_data JSONB NOT NULL DEFAULT '{}',
    file_name TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for better performance
CREATE INDEX idx_cases_status ON public.cases(status);
CREATE INDEX idx_cases_case_number ON public.cases(case_number);
CREATE INDEX idx_reports_case_id ON public.reports(case_id);
CREATE INDEX idx_reports_tool_name ON public.reports(tool_name);

-- Enable Row Level Security (public access for now - no auth required)
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (since no auth is implemented yet)
CREATE POLICY "Allow public read access to cases" 
ON public.cases FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to cases" 
ON public.cases FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to cases" 
ON public.cases FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access to cases" 
ON public.cases FOR DELETE 
USING (true);

CREATE POLICY "Allow public read access to reports" 
ON public.reports FOR SELECT 
USING (true);

CREATE POLICY "Allow public insert access to reports" 
ON public.reports FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow public update access to reports" 
ON public.reports FOR UPDATE 
USING (true);

CREATE POLICY "Allow public delete access to reports" 
ON public.reports FOR DELETE 
USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_cases_updated_at
BEFORE UPDATE ON public.cases
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();