// ゲーム本体で共有する状態・部屋・アイテム型。
import type { IconType } from 'react-icons';
export type ItemType = 'consumable'|'passive'|'gem';
export type ItemId = 'mirror'|'ring'|'sage_gem'|'party_set'|'money_tree'|'blessing_charm'|'shop_ticket'|'ruby'|'emerald'|'diamond'|'yata_mirror'|'kusanagi'|'immortal_mag';
export type Item = { id: ItemId; name:string; type:ItemType; desc:string; price:number; paramN?:number; count?:number; icon?:IconType };
export type Room = { tier:number; title:string; desc:string; result?:string; resultType?:'neutral'|'success'|'danger'|'gold'; kind?:string; payload?:any };
export type State = { floor:number; turnsLeft:number; luck:number; money:number; highScore:number; items:Item[]; logs:string[]; ringBuff:{active:boolean;turns:number;amount:number}; mirrorMultiplier:number; partySet:boolean; inHell:boolean };
