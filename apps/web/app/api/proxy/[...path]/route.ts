import { NextResponse } from 'next/server';
import { getGhlClient } from '@/lib/ghl';

/**
 * Generic GHL proxy: any path the UI needs that the SDK doesn't wrap yet
 * (e.g. contact status updates, workflow triggers) is forwarded to GHL.
 * Path is passed as /api/proxy/contacts/<id>/tags etc.
 */
export async function GET(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const url = new URL(req.url);
  const query = Object.fromEntries(url.searchParams.entries());
  const client = getGhlClient();
  const res = await client.transport.request({ method: 'GET', path: `/${path.join('/')}`, query });
  return NextResponse.json(res.body, { status: res.status });
}

export async function POST(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const client = getGhlClient();
  const res = await client.transport.request({ method: 'POST', path: `/${path.join('/')}`, body });
  return NextResponse.json(res.body, { status: res.status });
}

export async function PUT(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const client = getGhlClient();
  const res = await client.transport.request({ method: 'PUT', path: `/${path.join('/')}`, body });
  return NextResponse.json(res.body, { status: res.status });
}

export async function DELETE(req: Request, ctx: { params: Promise<{ path: string[] }> }) {
  const { path } = await ctx.params;
  const client = getGhlClient();
  const res = await client.transport.request({ method: 'DELETE', path: `/${path.join('/')}` });
  return NextResponse.json(res.body, { status: res.status });
}
