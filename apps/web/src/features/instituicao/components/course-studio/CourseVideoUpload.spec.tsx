import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { VIDEO_QUICK_UPLOAD_MAX_BYTES } from '@pdc/shared';
import { videosApi } from '@/lib/api/videos';
import { CourseVideoUpload } from './CourseVideoUpload';

vi.mock('@/lib/api/videos', () => ({
  videosApi: { uploadQuickR2: vi.fn(), uploadProfessionalR2: vi.fn() },
}));

function chooseFile(file: File): void {
  const input = screen.getByLabelText(/Enviar para o PDC/);
  if (!(input instanceof HTMLInputElement)) throw new Error('Input de vídeo não encontrado');
  fireEvent.change(input, { target: { files: [file] } });
}

describe('CourseVideoUpload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('encaminha ficheiros acima de 50 MB para o upload profissional', async () => {
    vi.mocked(videosApi.uploadProfessionalR2).mockResolvedValue({
      id: 'video-longo',
      provider: 'r2',
      mode: 'professional_upload',
      visibility: 'protected',
      status: 'ready',
      ownerId: 'instituicao-1',
      title: 'Aula longa',
    });
    render(<CourseVideoUpload title="Aula" onVideoReady={vi.fn()} />);
    expect(screen.getByText(/Até 50 MB usa envio rápido/)).toBeVisible();

    const file = new File(['video'], 'grande.mp4', { type: 'video/mp4' });
    Object.defineProperty(file, 'size', { value: VIDEO_QUICK_UPLOAD_MAX_BYTES + 1 });
    chooseFile(file);

    await waitFor(() => {
      expect(videosApi.uploadProfessionalR2).toHaveBeenCalledWith(
        file,
        'Aula',
        expect.any(Function)
      );
    });
    expect(videosApi.uploadQuickR2).not.toHaveBeenCalled();
  });

  it('rejeita ficheiros que não são MP4 antes de chamar a API', async () => {
    render(<CourseVideoUpload title="Aula" onVideoReady={vi.fn()} />);

    chooseFile(new File(['video'], 'aula.mov', { type: 'video/quicktime' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Seleciona um vídeo no formato MP4.'
    );
    expect(videosApi.uploadQuickR2).not.toHaveBeenCalled();
  });

  it('não confia na extensão MP4 quando o navegador declara outro formato', async () => {
    render(<CourseVideoUpload title="Aula" onVideoReady={vi.fn()} />);

    chooseFile(new File(['video'], 'aula.mp4', { type: 'video/quicktime' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Seleciona um vídeo no formato MP4.'
    );
    expect(videosApi.uploadQuickR2).not.toHaveBeenCalled();
    expect(videosApi.uploadProfessionalR2).not.toHaveBeenCalled();
  });

  it('normaliza um ficheiro MP4 sem MIME declarado antes do upload', async () => {
    vi.mocked(videosApi.uploadQuickR2).mockResolvedValue({
      id: 'video-sem-mime',
      provider: 'r2',
      mode: 'quick_upload',
      visibility: 'protected',
      status: 'ready',
      ownerId: 'instituicao-1',
      title: 'Aula',
    });
    render(<CourseVideoUpload title="Aula" onVideoReady={vi.fn()} />);

    chooseFile(new File(['video'], 'aula.MP4', { type: '' }));

    await waitFor(() => {
      expect(videosApi.uploadQuickR2).toHaveBeenCalledOnce();
    });
    const uploadedFile = vi.mocked(videosApi.uploadQuickR2).mock.calls[0]?.[0];
    expect(uploadedFile).toBeInstanceOf(File);
    expect(uploadedFile?.type).toBe('video/mp4');
  });

  it('mostra a falha e permite repetir o mesmo ficheiro', async () => {
    const onVideoReady = vi.fn();
    vi.mocked(videosApi.uploadQuickR2)
      .mockRejectedValueOnce(new Error('Falha no armazenamento'))
      .mockResolvedValueOnce({
        id: 'video-repetido',
        provider: 'r2',
        mode: 'quick_upload',
        visibility: 'protected',
        status: 'ready',
        ownerId: 'instituicao-1',
        title: 'Aula',
      });
    render(<CourseVideoUpload title="Aula" onVideoReady={onVideoReady} />);
    const file = new File(['video'], 'aula.mp4', { type: 'video/mp4' });

    chooseFile(file);

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha no armazenamento');
    const input = screen.getByLabelText(/Enviar para o PDC/);
    expect(input).not.toBeDisabled();
    expect(input).toHaveValue('');

    chooseFile(file);
    await waitFor(() => {
      expect(onVideoReady).toHaveBeenCalledWith('video-repetido');
    });
    expect(videosApi.uploadQuickR2).toHaveBeenCalledTimes(2);
    expect(videosApi.uploadQuickR2).toHaveBeenNthCalledWith(2, file, 'Aula');
  });

  it('entrega ao builder o id do vídeo protegido depois do upload', async () => {
    const onVideoReady = vi.fn();
    vi.mocked(videosApi.uploadQuickR2).mockResolvedValue({
      id: 'video-1',
      provider: 'r2',
      mode: 'quick_upload',
      visibility: 'protected',
      status: 'ready',
      ownerId: 'instituicao-1',
      title: 'Aula',
    });
    render(<CourseVideoUpload title="Aula" onVideoReady={onVideoReady} />);

    chooseFile(new File(['video'], 'aula.mp4', { type: 'video/mp4' }));

    await waitFor(() => {
      expect(onVideoReady).toHaveBeenCalledWith('video-1');
    });
  });
});
