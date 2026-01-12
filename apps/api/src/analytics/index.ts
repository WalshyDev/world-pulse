import { env } from 'cloudflare:workers';
import { Env } from '../types';

/* eslint-disable no-multi-spaces */
export interface Data {
  //
  indexId: string;

  // Blobs
  method: string;    // blob1
  path: string;      // blob2
  ip: string;        // blob3
  country: string;   // blob4
  userAgent: string; // blob5
  referrer: string;  // blob6
  error: string;     // blob7

  // doubles
  responseTimeMs: number;
  status: number;
}

export class Analytics {

  private data: Partial<Data>;

  constructor(data?: Partial<Data>) {
    this.data = data || {};
  }

  set<K extends keyof Data>(key: K, value: Data[K]) {
    this.data[key] = value;
  }

  setData(data: Partial<Data>) {
    this.data = { ...this.data, ...data };
  }

  write() {
    if (!(env as Env).ANALYTICS) {
      console.log({
        message: 'Writing analytics to logs',
        data: this.data,
      });
      return;
    }

    (env as Env).ANALYTICS.writeDataPoint({
      indexes: [this.data.indexId || ''],
      blobs: [
        this.data.method || '',
        this.data.path || '',
        this.data.ip || '',
        this.data.country || '',
        this.data.userAgent || '',
        this.data.referrer || '',
        this.data.error || '',
      ],
      doubles: [
        this.data.responseTimeMs || 0,
        this.data.status || 0,
      ],
    });
  }
}
