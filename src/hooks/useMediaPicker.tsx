import { useCallback, useState } from 'react';
import { MediaPickerSheet, PickedMedia } from '../components/ui/MediaPickerSheet';

interface UseMediaPickerOptions {
  onSelect: (media: PickedMedia) => void;
  allowCamera?: boolean;
  allowLibrary?: boolean;
  title?: string;
}

/**
 * Wires the shared MediaPickerSheet to any screen. Returns `open()` to show
 * the sheet and the JSX element to mount. Handles single-pick + close
 * sequencing so callers just get the chosen media.
 */
export function useMediaPicker({
  onSelect,
  allowCamera = true,
  allowLibrary = true,
  title,
}: UseMediaPickerOptions) {
  const [visible, setVisible] = useState(false);

  const open = useCallback(() => setVisible(true), []);
  const close = useCallback(() => setVisible(false), []);

  const picker = (
    <MediaPickerSheet
      visible={visible}
      onClose={close}
      onSelect={onSelect}
      allowCamera={allowCamera}
      allowLibrary={allowLibrary}
      title={title}
    />
  );

  return { open, close, visible, picker };
}
