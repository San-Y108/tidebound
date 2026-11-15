// Inline data URLs keep the offline single-file build self-contained.
import ocean from '../assets/ocean-v2.webp?inline';
import tile from '../assets/tile-v2.png?inline';
import ballista from '../assets/ballista-v2.png?inline';
import cannon from '../assets/cannon-v2.png?inline';
import net from '../assets/net-v2.png?inline';
import collector from '../assets/collector-v2.png?inline';
import purifier from '../assets/purifier-v2.png?inline';
import beacon from '../assets/beacon-v2.png?inline';
import coral from '../assets/coral-v2.png?inline';
import mast from '../assets/mast-v2.png?inline';
import leviathan from '../assets/leviathan-v2.png?inline';
import pirate from '../assets/pirate-v2.png?inline';
export const OCEAN=ocean;
export const ART={tile,ballista,cannon,net,collector,purifier,beacon,coral,mast,leviathan,pirate};
export function artImage(type,className=''){return ART[type]?`<img class="art-sprite ${className}" src="${ART[type]}" alt="" draggable="false">`:'';}
