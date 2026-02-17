import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Case {
  id: string;
  case_number: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  investigator_name: string | null;
  created_at: string;
  updated_at: string;
}

export const useCases = () => {
  const [cases, setCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCases = async () => {
    try {
      const { data, error } = await supabase
        .from('cases')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setCases(data || []);
    } catch (error) {
      console.error('Error fetching cases:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  return { cases, loading, refetch: fetchCases };
};

export const saveReportToCase = async (
  caseId: string | null,
  toolName: string,
  reportType: string,
  reportData: unknown,
  fileName?: string,
  notes?: string
) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  const { error } = await supabase
    .from('reports')
    .insert([{
      case_id: caseId,
      tool_name: toolName,
      report_type: reportType,
      report_data: reportData as never,
      file_name: fileName || null,
      notes: notes || null,
      user_id: user?.id
    }]);
  
  if (error) throw error;
  return true;
};
