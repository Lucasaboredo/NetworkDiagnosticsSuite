import RNHTMLtoPDF from 'react-native-html-to-pdf';
import Share from 'react-native-share';
import {Installation, Device, Diagnostic} from '../domain/types';

const escapeHtml=(value:unknown)=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]!));
const imageTag=(path:string)=>`<img src="${escapeHtml(path.startsWith('file://')?path:`file://${path}`)}" />`;

export async function generateInstallationPdf(installation:Installation,device?:Device,diagnostics:Diagnostic[]=[]){
  const diagnosticRows=diagnostics.map(d=>`<tr><td>${escapeHtml(d.type.toUpperCase())}</td><td>${escapeHtml(new Date(d.createdAt).toLocaleString('es-AR'))}</td><td>${escapeHtml(d.status)}</td></tr>`).join('');
  const html=`<!doctype html><html><head><meta charset="utf-8"><style>
  @page{margin:34px}body{font-family:Arial,sans-serif;color:#17232d;font-size:11px}header{border-bottom:3px solid #1a8f64;padding-bottom:16px;margin-bottom:20px}.brand{font-size:10px;letter-spacing:2px;color:#1a8f64;font-weight:bold}h1{font-size:25px;margin:6px 0}.meta{color:#5d6d79}.grid{display:flex;gap:14px}.box{border:1px solid #d7e0e5;border-radius:8px;padding:13px;margin:8px 0;flex:1}h2{font-size:14px;margin:0 0 10px}.label{color:#71818c;font-size:9px;text-transform:uppercase;letter-spacing:.8px}.value{font-size:12px;margin:3px 0 10px}table{width:100%;border-collapse:collapse}th,td{text-align:left;border-bottom:1px solid #d7e0e5;padding:8px}th{color:#5d6d79}.photos{display:flex;flex-wrap:wrap;gap:10px}.photos img{width:47%;height:180px;object-fit:cover;border-radius:6px}footer{margin-top:24px;color:#71818c;font-size:9px}</style></head><body>
  <header><div class="brand">NETWORK DIAGNOSTICS SUITE</div><h1>Reporte de instalación</h1><div class="meta">ID ${escapeHtml(installation.id)} · ${escapeHtml(new Date(installation.createdAt).toLocaleString('es-AR'))}</div></header>
  <div class="grid"><div class="box"><h2>Instalación</h2><div class="label">Sitio</div><div class="value">${escapeHtml(installation.site)}</div><div class="label">Equipo</div><div class="value">${escapeHtml(installation.equipment)}</div><div class="label">Dispositivo</div><div class="value">${escapeHtml(device?.hostname||device?.ip||'Sin asociar')}</div></div><div class="box"><h2>Ubicación</h2><div class="label">Coordenadas</div><div class="value">${installation.latitude.toFixed(6)}, ${installation.longitude.toFixed(6)}</div><div class="label">Precisión</div><div class="value">${installation.accuracy?`± ${Math.round(installation.accuracy)} m`:'No informada'}</div></div></div>
  <div class="box"><h2>Observaciones técnicas</h2><p>${escapeHtml(installation.notes||'Sin observaciones')}</p></div>
  <div class="box"><h2>Diagnósticos asociados</h2><table><thead><tr><th>Tipo</th><th>Fecha</th><th>Estado</th></tr></thead><tbody>${diagnosticRows||'<tr><td colspan="3">No se asociaron diagnósticos.</td></tr>'}</tbody></table></div>
  ${installation.photos.length?`<div class="box"><h2>Evidencia fotográfica</h2><div class="photos">${installation.photos.map(imageTag).join('')}</div></div>`:''}
  <footer>Generado localmente por Network Diagnostics Suite. El documento puede producirse sin acceso a Internet.</footer></body></html>`;
  const result=await RNHTMLtoPDF.convert({html,fileName:`instalacion-${installation.id}`,directory:'Documents'});
  if(!result.filePath)throw new Error('El generador no devolvió la ruta del PDF.');
  return result.filePath;
}

export async function sharePdf(path:string){await Share.open({url:path.startsWith('file://')?path:`file://${path}`,type:'application/pdf',title:'Compartir reporte de instalación'});}
