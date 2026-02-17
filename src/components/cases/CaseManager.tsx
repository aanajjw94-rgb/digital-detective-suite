import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Plus, FolderOpen, FileText, Trash2, Edit, Eye, Search, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

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

interface Report {
  id: string;
  case_id: string | null;
  tool_name: string;
  report_type: string;
  report_data: unknown;
  file_name: string | null;
  notes: string | null;
  created_at: string;
}

const CaseManager = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<Case[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  const [newCase, setNewCase] = useState({
    case_number: '',
    title: '',
    description: '',
    status: 'open',
    priority: 'medium',
    investigator_name: ''
  });

  useEffect(() => {
    fetchCases();
    fetchReports();
  }, []);

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
      toast.error('فشل في جلب القضايا');
    } finally {
      setLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setReports(data || []);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const generateCaseNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `CASE-${year}${month}-${random}`;
  };

  const createCase = async () => {
    if (!newCase.title.trim()) {
      toast.error('يرجى إدخال عنوان القضية');
      return;
    }

    try {
      const caseNumber = newCase.case_number || generateCaseNumber();
      const { error } = await supabase
        .from('cases')
        .insert([{ ...newCase, case_number: caseNumber, user_id: user?.id }]);
      
      if (error) throw error;
      
      toast.success('تم إنشاء القضية بنجاح');
      setIsCreateDialogOpen(false);
      setNewCase({
        case_number: '',
        title: '',
        description: '',
        status: 'open',
        priority: 'medium',
        investigator_name: ''
      });
      fetchCases();
    } catch (error) {
      console.error('Error creating case:', error);
      toast.error('فشل في إنشاء القضية');
    }
  };

  const deleteCase = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه القضية؟')) return;
    
    try {
      const { error } = await supabase
        .from('cases')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم حذف القضية');
      fetchCases();
      fetchReports();
    } catch (error) {
      console.error('Error deleting case:', error);
      toast.error('فشل في حذف القضية');
    }
  };

  const updateCaseStatus = async (id: string, status: string) => {
    try {
      const { error } = await supabase
        .from('cases')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
      
      toast.success('تم تحديث الحالة');
      fetchCases();
    } catch (error) {
      console.error('Error updating case:', error);
      toast.error('فشل في تحديث الحالة');
    }
  };

  const getCaseReports = (caseId: string) => {
    return reports.filter(r => r.case_id === caseId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'in_progress': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'closed': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'archived': return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'high': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'open': return 'مفتوحة';
      case 'in_progress': return 'قيد التحقيق';
      case 'closed': return 'مغلقة';
      case 'archived': return 'مؤرشفة';
      default: return status;
    }
  };

  const getPriorityLabel = (priority: string) => {
    switch (priority) {
      case 'critical': return 'حرجة';
      case 'high': return 'عالية';
      case 'medium': return 'متوسطة';
      case 'low': return 'منخفضة';
      default: return priority;
    }
  };

  const filteredCases = cases.filter(c => 
    c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.case_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.investigator_name && c.investigator_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <Card className="bg-cyber-darker border-cyber-green/30">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-cyber-green flex items-center gap-2">
            <FolderOpen className="w-6 h-6" />
            إدارة القضايا الجنائية
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { fetchCases(); fetchReports(); }}
              className="border-cyber-green/30 text-cyber-green hover:bg-cyber-green/10"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-cyber-green text-cyber-darker hover:bg-cyber-green/80">
                  <Plus className="w-4 h-4 mr-2" />
                  قضية جديدة
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-cyber-darker border-cyber-green/30 text-white max-w-lg">
                <DialogHeader>
                  <DialogTitle className="text-cyber-green">إنشاء قضية جديدة</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">رقم القضية (اختياري)</label>
                    <Input
                      placeholder="CASE-2024XX-XXXX"
                      value={newCase.case_number}
                      onChange={(e) => setNewCase({ ...newCase, case_number: e.target.value })}
                      className="bg-cyber-dark border-cyber-green/30 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">عنوان القضية *</label>
                    <Input
                      placeholder="عنوان القضية"
                      value={newCase.title}
                      onChange={(e) => setNewCase({ ...newCase, title: e.target.value })}
                      className="bg-cyber-dark border-cyber-green/30 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">الوصف</label>
                    <Textarea
                      placeholder="وصف القضية..."
                      value={newCase.description}
                      onChange={(e) => setNewCase({ ...newCase, description: e.target.value })}
                      className="bg-cyber-dark border-cyber-green/30 text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">الحالة</label>
                      <Select value={newCase.status} onValueChange={(v) => setNewCase({ ...newCase, status: v })}>
                        <SelectTrigger className="bg-cyber-dark border-cyber-green/30 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-cyber-darker border-cyber-green/30">
                          <SelectItem value="open">مفتوحة</SelectItem>
                          <SelectItem value="in_progress">قيد التحقيق</SelectItem>
                          <SelectItem value="closed">مغلقة</SelectItem>
                          <SelectItem value="archived">مؤرشفة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 mb-1 block">الأولوية</label>
                      <Select value={newCase.priority} onValueChange={(v) => setNewCase({ ...newCase, priority: v })}>
                        <SelectTrigger className="bg-cyber-dark border-cyber-green/30 text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-cyber-darker border-cyber-green/30">
                          <SelectItem value="low">منخفضة</SelectItem>
                          <SelectItem value="medium">متوسطة</SelectItem>
                          <SelectItem value="high">عالية</SelectItem>
                          <SelectItem value="critical">حرجة</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400 mb-1 block">اسم المحقق</label>
                    <Input
                      placeholder="اسم المحقق"
                      value={newCase.investigator_name}
                      onChange={(e) => setNewCase({ ...newCase, investigator_name: e.target.value })}
                      className="bg-cyber-dark border-cyber-green/30 text-white"
                    />
                  </div>
                  <Button onClick={createCase} className="w-full bg-cyber-green text-cyber-darker hover:bg-cyber-green/80">
                    إنشاء القضية
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="cases" className="w-full">
          <TabsList className="bg-cyber-dark border border-cyber-green/30 mb-4">
            <TabsTrigger value="cases" className="data-[state=active]:bg-cyber-green data-[state=active]:text-cyber-darker">
              القضايا ({cases.length})
            </TabsTrigger>
            <TabsTrigger value="reports" className="data-[state=active]:bg-cyber-green data-[state=active]:text-cyber-darker">
              التقارير ({reports.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="cases">
            <div className="mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <Input
                  placeholder="بحث في القضايا..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 bg-cyber-dark border-cyber-green/30 text-white"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-gray-400">جاري التحميل...</div>
            ) : filteredCases.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                {searchTerm ? 'لا توجد نتائج' : 'لا توجد قضايا بعد'}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredCases.map((caseItem) => (
                  <div
                    key={caseItem.id}
                    className="p-4 bg-cyber-dark rounded-lg border border-cyber-green/20 hover:border-cyber-green/40 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-cyber-cyan font-mono text-sm">{caseItem.case_number}</span>
                          <Badge className={getStatusColor(caseItem.status)}>
                            {getStatusLabel(caseItem.status)}
                          </Badge>
                          <Badge className={getPriorityColor(caseItem.priority)}>
                            {getPriorityLabel(caseItem.priority)}
                          </Badge>
                        </div>
                        <h3 className="text-white font-medium mb-1">{caseItem.title}</h3>
                        {caseItem.description && (
                          <p className="text-gray-400 text-sm mb-2 line-clamp-2">{caseItem.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-gray-500">
                          {caseItem.investigator_name && (
                            <span>المحقق: {caseItem.investigator_name}</span>
                          )}
                          <span>التقارير: {getCaseReports(caseItem.id).length}</span>
                          <span>{new Date(caseItem.created_at).toLocaleDateString('ar-SA')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select 
                          value={caseItem.status} 
                          onValueChange={(v) => updateCaseStatus(caseItem.id, v)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs bg-cyber-darker border-cyber-green/30">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-cyber-darker border-cyber-green/30">
                            <SelectItem value="open">مفتوحة</SelectItem>
                            <SelectItem value="in_progress">قيد التحقيق</SelectItem>
                            <SelectItem value="closed">مغلقة</SelectItem>
                            <SelectItem value="archived">مؤرشفة</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setSelectedCase(caseItem); setIsViewDialogOpen(true); }}
                          className="text-cyber-cyan hover:bg-cyber-cyan/10"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteCase(caseItem.id)}
                          className="text-red-400 hover:bg-red-400/10"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="reports">
            {reports.length === 0 ? (
              <div className="text-center py-8 text-gray-400">لا توجد تقارير بعد</div>
            ) : (
              <div className="space-y-3">
                {reports.map((report) => {
                  const linkedCase = cases.find(c => c.id === report.case_id);
                  return (
                    <div
                      key={report.id}
                      className="p-4 bg-cyber-dark rounded-lg border border-cyber-green/20"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-cyber-cyan" />
                        <span className="text-white font-medium">{report.tool_name}</span>
                        <Badge variant="outline" className="border-cyber-green/30 text-cyber-green">
                          {report.report_type}
                        </Badge>
                        {linkedCase && (
                          <Badge className="bg-cyber-green/20 text-cyber-green border-cyber-green/30">
                            {linkedCase.case_number}
                          </Badge>
                        )}
                      </div>
                      {report.file_name && (
                        <p className="text-gray-400 text-sm">{report.file_name}</p>
                      )}
                      {report.notes && (
                        <p className="text-gray-500 text-sm mt-1">{report.notes}</p>
                      )}
                      <p className="text-xs text-gray-600 mt-2">
                        {new Date(report.created_at).toLocaleString('ar-SA')}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Case Details Dialog */}
        <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <DialogContent className="bg-cyber-darker border-cyber-green/30 text-white max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-cyber-green">تفاصيل القضية</DialogTitle>
            </DialogHeader>
            {selectedCase && (
              <div className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">رقم القضية</label>
                    <p className="text-cyber-cyan font-mono">{selectedCase.case_number}</p>
                  </div>
                  <div>
                    <label className="text-sm text-gray-400">الحالة</label>
                    <Badge className={getStatusColor(selectedCase.status)}>
                      {getStatusLabel(selectedCase.status)}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-gray-400">العنوان</label>
                  <p className="text-white">{selectedCase.title}</p>
                </div>
                {selectedCase.description && (
                  <div>
                    <label className="text-sm text-gray-400">الوصف</label>
                    <p className="text-gray-300">{selectedCase.description}</p>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-gray-400">الأولوية</label>
                    <Badge className={getPriorityColor(selectedCase.priority)}>
                      {getPriorityLabel(selectedCase.priority)}
                    </Badge>
                  </div>
                  {selectedCase.investigator_name && (
                    <div>
                      <label className="text-sm text-gray-400">المحقق</label>
                      <p className="text-white">{selectedCase.investigator_name}</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <label className="text-gray-400">تاريخ الإنشاء</label>
                    <p className="text-white">{new Date(selectedCase.created_at).toLocaleString('ar-SA')}</p>
                  </div>
                  <div>
                    <label className="text-gray-400">آخر تحديث</label>
                    <p className="text-white">{new Date(selectedCase.updated_at).toLocaleString('ar-SA')}</p>
                  </div>
                </div>

                <div className="border-t border-cyber-green/20 pt-4">
                  <h4 className="text-cyber-cyan font-medium mb-3">التقارير المرتبطة ({getCaseReports(selectedCase.id).length})</h4>
                  {getCaseReports(selectedCase.id).length === 0 ? (
                    <p className="text-gray-500 text-sm">لا توجد تقارير مرتبطة بهذه القضية</p>
                  ) : (
                    <div className="space-y-2">
                      {getCaseReports(selectedCase.id).map((report) => (
                        <div key={report.id} className="p-3 bg-cyber-dark rounded border border-cyber-green/10">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-cyber-cyan" />
                            <span className="text-white">{report.tool_name}</span>
                            <span className="text-gray-500">-</span>
                            <span className="text-gray-400">{report.report_type}</span>
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(report.created_at).toLocaleString('ar-SA')}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
};

export default CaseManager;
