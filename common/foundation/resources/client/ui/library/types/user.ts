export const USER_MODEL = 'user';

export interface User {
  id: number;
  name: string;
  email: string;
  price:number;
  language?: string;
  timezone?: string;
  country?: string;
  stripe_account_id?:string;
  balance:number;
}

export interface CompactUser {
  id: number;
  name: string;
  image?: string;
}

export interface CompactUserWithEmail extends CompactUser {
  email: string;
}
