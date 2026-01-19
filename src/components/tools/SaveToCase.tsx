import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCases, saveReportToCase } from '@/hooks/useCases';
import { Database, Save, Check } from 'lucide-react';
import { toast } from 'sonner';

interface SaveToCaseProps {
  toolName: string;
  reportType: string;
  reportData: unknown;
  fileName?: string;
  disabled?: boolean;
}

export const SaveToCase = ({ toolName, reportType, reportData, fileName, disabled }: SaveToCaseProps) => {
  const { cases, loading } = useCases();
  const [selectedCaseId, setSelectedCaseId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!selectedCaseId) {
      toast.error('يرجى اختيار قضية');
      return;
    }

    setSaving(true);
    try {
      await saveReportToCase(
        selectedCaseId,
        toolName,
        reportType,
        reportData,
        fileName,
        notes
      );
      toast.success('تم حفظ التقرير بنجاح');
      setSaved(true);
      setIsOpen(false);
      setNotes('');
      setTimeout(() => setSaved(false), 3000);
    } catch (error) {
      console.error('Error saving report:', error);
      toast.error('فشل في حفظ التقرير');
    } finally {
      setSaving(false);
    }
  };

  const openCases = cases.filter(c => c.status !== 'closed' && c.status !== 'archived');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className={`border-cyber-cyan/30 hover:bg-cyber-cyan/10 ${
            saved ? 'text-green-400 border-green-400/30' : 'text-cyber-cyan'
          }`}
        >
          {saved ? (
            <>
              <Check className="w-4 h-4 mr-2" />
              تم الحفظ
            </>
          ) : (
            <>
              <Database className="w-4 h-4 mr-2" />
              حفظ في قضية
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-cyber-darker border-cyber-green/30 text-white">
        <DialogHeader>
          <DialogTitle className="text-cyber-green flex items-center gap-2">
            <Save className="w-5 h-5" />
            حفظ التقرير في قضية
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-4">
          <div>
            <label className="text-sm text-gray-400 mb-2 block">اختر القضية</label>
            {loading ? (
              <div className="text-gray-500 text-sm">جاري التحميل...</div>
            ) : openCases.length === 0 ? (
              <div className="text-yellow-400 text-sm p-3 bg-yellow-400/10 rounded border border-yellow-400/20">
                لا توجد قضايا مفتوحة. يرجى إنشاء قضية جديدة أولاً.
              </div>
            ) : (
              <Select value={selectedCaseId} onValueChange={setSelectedCaseId}>
                <SelectTrigger className="bg-cyber-dark border-cyber-green/30 text-white">
                  <SelectValue placeholder="اختر قضية..." />
                </SelectTrigger>
                <SelectContent className="bg-cyber-darker border-cyber-green/30">
                  {openCases.map((caseItem) => (
                    <SelectItem key={caseItem.id} value={caseItem.id}>
                      <span className="font-mono text-cyber-cyan text-xs mr-2">
                        {caseItem.case_number}
                      </span>
                      <span>{caseItem.title}</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <label className="text-sm text-gray-400 mb-2 block">ملاحظات (اختياري)</label>
            <Textarea
              placeholder="أضف ملاحظات حول هذا التقرير..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="bg-cyber-dark border-cyber-green/30 text-white resize-none"
              rows={3}
            />
          </div>

          <div className="p-3 bg-cyber-dark/50 rounded border border-cyber-green/10">
            <div className="text-xs text-gray-400 space-y-1">
              <div><span className="text-gray-500">الأداة:</span> {toolName}</div>
              <div><span className="text-gray-500">نوع التقرير:</span> {reportType}</div>
              {fileName && <div><span className="text-gray-500">الملف:</span> {fileName}</div>}
            </div>
          </div>

          <Button
            onClick={handleSave}
            disabled={saving || !selectedCaseId || openCases.length === 0}
            className="w-full bg-cyber-green text-cyber-darker hover:bg-cyber-green/80"
          >
            {saving ? 'جاري الحفظ...' : 'حفظ التقرير'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
