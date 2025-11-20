// src/components/ImageUploader.jsx
import React, { memo } from 'react';
import { Upload } from 'lucide-react';

function ImageUploader({onFile}) {
  // accepts file, validate externally
  return (
    <div className="uploader">
      <input 
        className="fileInput" 
        type="file" 
        accept="image/*" 
        id="upload-input"
        onChange={(e)=>{
          const f = e.target.files?.[0];
          onFile?.(f);
          e.target.value = ''; // reset so same file can be re-uploaded
        }}
      />
      <div style={{padding:'12px'}}>
        <div style={{fontSize:16, marginBottom:12}}>Upload the image you want to turn into a prompt</div>
        <div style={{display:'flex', justifyContent:'center'}}>
          <label htmlFor="upload-input" className="btn" style={{cursor: 'pointer'}}>
            <Upload size={18} />
            <span>Upload image</span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default memo(ImageUploader);
