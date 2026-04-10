'use client';

import { Toaster as SonnerToaster } from 'sonner';
import { useEffect } from 'react';

export function Toaster() {
  // #region agent log
  useEffect(() => {
    fetch('http://127.0.0.1:7301/ingest/0e249b43-85b9-4188-a471-babf5b8dabb0',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'09a1a0'},body:JSON.stringify({sessionId:'09a1a0',runId:'pre-fix',hypothesisId:'H0',location:'2une_admin/app/toaster.tsx:mount',message:'Toaster mounted (client)',data:{},timestamp:Date.now()})}).catch(()=>{});
  }, []);
  // #endregion
  return <SonnerToaster richColors position="top-right" />;
}

