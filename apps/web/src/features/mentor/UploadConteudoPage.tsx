import { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { mediaApi } from '@/lib/api/media';
import { toast } from '@/hooks/useToast';
import { Upload, File, CheckCircle2, AlertCircle } from 'lucide-react';

export function UploadConteudoPage() {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ url: string; key: string } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.size > 50 * 1024 * 1024) {
        toast({ 
          title: 'Ficheiro muito grande', 
          description: 'O tamanho máximo permitido é 50MB.', 
          variant: 'error' 
        });
        return;
      }
      setFile(selectedFile);
      setUploadResult(null);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await mediaApi.upload(file);
      setUploadResult(result);
      setFile(null);
      toast({ title: 'Upload concluído com sucesso!' });
    } catch (err: unknown) {
      const error = err as Error;
      toast({ 
        title: 'Erro no upload', 
        description: error.message, 
        variant: 'error' 
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileChange(e);
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-sora">Upload de Conteúdo</h1>
        <p className="text-text-muted mt-1">Envia ficheiros (PDF, imagens, etc.) para usar nos teus cursos e simulações.</p>
      </div>

      <Card className="p-8 flex flex-col items-center justify-center border-dashed border-2 border-border/60 bg-surface/50">
        {!uploadResult ? (
          <>
            <div className="h-16 w-16 rounded-full bg-amber/10 flex items-center justify-center mb-4">
              <Upload className="h-8 w-8 text-amber" />
            </div>
            
            <div className="text-center mb-6">
              <p className="text-lg font-medium text-text-primary">
                {file ? file.name : 'Seleciona um ficheiro'}
              </p>
              <p className="text-sm text-text-muted">
                {file ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : 'PDF, PNG, JPG até 50MB'}
              </p>
            </div>

            <div className="flex gap-3">
              <label className="cursor-pointer">
                <input 
                  type="file" 
                  className="hidden" 
                  onChange={onFileSelect}
                  disabled={isUploading}
                />
                <Button asChild variant="secondary" disabled={isUploading}>
                  <span>Selecionar Ficheiro</span>
                </Button>
              </label>

              {file && (
                <Button onClick={() => { void handleUpload(); }} isLoading={isUploading}>
                  Começar Upload
                </Button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mb-4 mx-auto">
              <CheckCircle2 className="h-8 w-8 text-success" />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Upload Completo!</h3>
            <p className="text-sm text-text-muted mb-6">O teu ficheiro foi processado e está pronto a usar.</p>
            
            <div className="bg-surface border border-border rounded-lg p-3 mb-6 text-left overflow-hidden">
              <p className="text-xs font-mono text-amber break-all">{uploadResult.url}</p>
            </div>

            <Button variant="secondary" onClick={() => { setUploadResult(null); }}>
              Enviar Outro Ficheiro
            </Button>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-4 flex gap-4 items-start">
          <div className="p-2 rounded-lg bg-info/10 text-info">
            <File className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Ficheiros Suportados</h4>
            <p className="text-xs text-text-muted mt-1">PDF, DOCX, PNG, JPG, ZIP e MP4 (até 50MB).</p>
          </div>
        </Card>
        
        <Card className="p-4 flex gap-4 items-start">
          <div className="p-2 rounded-lg bg-warning/10 text-warning">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div>
            <h4 className="font-bold text-sm">Vídeos Grandes</h4>
            <p className="text-xs text-text-muted mt-1">Para vídeos com mais de 50MB, recomendamos usar YouTube ou Vimeo.</p>
          </div>
        </Card>
      </div>
    </div>
  );
}
