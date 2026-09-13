import { useId, useState } from 'react';
import { Video } from 'lucide-react';
import { VIDEO_QUICK_UPLOAD_MAX_BYTES } from '@pdc/shared';
import { videosApi } from '@/lib/api/videos';

const VIDEO_QUICK_UPLOAD_MAX_MB = VIDEO_QUICK_UPLOAD_MAX_BYTES / (1024 * 1024);

interface CourseVideoUploadProps {
  title: string;
  onVideoReady: (videoId: string) => void;
}

export function CourseVideoUpload({
  title,
  onVideoReady,
}: CourseVideoUploadProps): React.JSX.Element {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const helperId = `${inputId}-helper`;
  const statusId = `${inputId}-status`;
  const errorId = `${inputId}-error`;

  const upload = async (file: File | undefined) => {
    if (!file || isUploading) return;
    setError(null);
    const isMp4 =
      file.type === 'video/mp4' || (file.type === '' && file.name.toLowerCase().endsWith('.mp4'));
    if (!isMp4) {
      setError('Seleciona um vídeo no formato MP4.');
      return;
    }
    const uploadFile =
      file.type !== ''
        ? file
        : new File([file], file.name, { type: 'video/mp4', lastModified: file.lastModified });
    setIsUploading(true);
    setProgress(0);
    try {
      const video =
        uploadFile.size <= VIDEO_QUICK_UPLOAD_MAX_BYTES
          ? await videosApi.uploadQuickR2(uploadFile, title.trim() || uploadFile.name)
          : await videosApi.uploadProfessionalR2(
              uploadFile,
              title.trim() || uploadFile.name,
              (nextProgress) => {
                setProgress(nextProgress);
              }
            );
      onVideoReady(video.id);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Falha no upload do vídeo');
    } finally {
      setIsUploading(false);
      setProgress(null);
    }
  };

  return (
    <div className="border-border bg-recessed/40 block space-y-2 rounded-lg border border-dashed p-4">
      <label
        htmlFor={inputId}
        className="text-ink-primary flex items-center gap-2 text-sm font-semibold"
      >
        <Video size={16} className="text-accent" aria-hidden="true" /> Enviar para o PDC
      </label>
      <p id={helperId} className="text-ink-tertiary block text-xs leading-5">
        Vídeo privado em MP4, armazenado no PDC. Até {String(VIDEO_QUICK_UPLOAD_MAX_MB)} MB usa
        envio rápido; ficheiros maiores usam envio profissional por partes, conforme o limite da
        conta.
      </p>
      <input
        id={inputId}
        type="file"
        accept="video/mp4"
        aria-describedby={`${helperId} ${statusId}${error ? ` ${errorId}` : ''}`}
        disabled={isUploading}
        onChange={(event) => {
          const input = event.currentTarget;
          void upload(input.files?.[0]).finally(() => {
            input.value = '';
          });
        }}
        className="text-ink-secondary file:border-border file:bg-canvas file:text-ink-primary block w-full text-xs file:mr-3 file:min-h-10 file:rounded-md file:border file:px-3 file:text-xs file:font-semibold disabled:opacity-60"
      />
      <p id={statusId} className="text-ink-tertiary text-xs" aria-live="polite">
        {isUploading
          ? progress && progress > 0
            ? `A enviar vídeo... ${String(progress)}%`
            : 'A preparar o envio seguro...'
          : ''}
      </p>
      {error ? (
        <p id={errorId} role="alert" className="text-error text-xs">
          {error}
        </p>
      ) : null}
    </div>
  );
}
