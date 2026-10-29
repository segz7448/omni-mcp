import converter from 'swagger2openapi';
// Conversion must never retrieve external URLs or local files named by a spec.
function checkRefs(value, depth=0) {
  if(depth>150)throw new Error('Spec exceeds nesting limit');
  if(!value || typeof value!=='object')return;
  if(typeof value.$ref==='string' && !value.$ref.startsWith('#/'))throw new Error('External references must be bundled before import');
  for(const [key,child] of Object.entries(value)) {if (!key.startsWith('x-') && !['example','examples','description'].includes(key))checkRefs(child,depth+1);}
}
export async function normalizeSpec(doc) {
  checkRefs(doc);
  if(doc.swagger==='2.0') {
    const result=await converter.convertObj(doc,{patch:false,warnOnly:false,resolve:false,resolveInternal:false});
    checkRefs(result.openapi);
    return {doc:result.openapi,conversion:'swagger-2.0-to-openapi-3.0'};
  }
  return {doc,conversion:'none'};
}
