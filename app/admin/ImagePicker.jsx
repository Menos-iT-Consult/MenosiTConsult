'use client';

import { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { toast } from './ui';
import { MAX_IMAGE_MB } from './api';

const ImagePicker = forwardRef(function ImagePicker({ label = 'Choose image', alt = 'Image preview' }, ref) {
  const [current, setCurrent] = useState('');
  const [preview, setPreview] = useState(null);
  const [removed, setRemoved] = useState(false);
  const fileRef = useRef(null);
  const inputRef = useRef(null);

  useImperativeHandle(ref, () => ({
    set(url) {
      setCurrent(url || '');
      fileRef.current = null;
      setRemoved(false);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
    },
    reset() {
      this.set('');
    },
    pendingFile() {
      return fileRef.current;
    },
    isRemoved() {
      return removed && !fileRef.current;
    },
  }));

  const hasImage = !!(preview || (current && !removed));

  function onPick(f) {
    if (!f) return;
    if (f.size > MAX_IMAGE_MB * 1024 * 1024) {
      toast(`Image too large (max ${MAX_IMAGE_MB} MB).`, 'error');
      if (inputRef.current) inputRef.current.value = '';
      return;
    }
    fileRef.current = f;
    setRemoved(false);
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result);
    reader.readAsDataURL(f);
  }

  function onRemove() {
    fileRef.current = null;
    setRemoved(true);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
  }

  return (
    <div className="image-picker">
      <img className="image-preview" alt={alt} src={preview || ''} hidden={!preview} />
      <div className="image-placeholder" hidden={!!preview}>
        {current && !removed ? 'Current image set' : 'No image chosen'}
      </div>
      <div className="image-picker-actions">
        <input
          type="file"
          ref={inputRef}
          accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
          hidden
          onChange={(e) => onPick(e.target.files && e.target.files[0])}
        />
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => inputRef.current && inputRef.current.click()}>
          {label}
        </button>
        <button type="button" className="btn btn-sm btn-danger" hidden={!hasImage} onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  );
});

export default ImagePicker;
