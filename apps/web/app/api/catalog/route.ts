import { NextResponse } from 'next/server';
import { SERVICE_ROUTES } from '@appointiq/engine';
import { getGhlClient } from '@/lib/ghl';
import { ensureRuntime } from '@/lib/runtime';

/** Everything the landing page, booking widget and docs need to know the clinic. */
export async function GET() {
  await ensureRuntime();
  const client = getGhlClient();

  const [calendars, users, customFields, workflows] = await Promise.all([
    client.transport.request({ method: 'GET', path: '/calendars' }),
    client.transport.request({ method: 'GET', path: '/users' }),
    client.transport.request({ method: 'GET', path: '/custom-fields', query: { model: 'contact' } }),
    client.transport.request({ method: 'GET', path: '/workflows' }),
  ]);

  const calList = (calendars.body as { calendars: { id: string; name: string }[] }).calendars ?? [];
  const userList = (users.body as { users: { id: string; firstName: string; lastName: string; role: string }[] }).users ?? [];
  const cfList = (customFields.body as { customFields: { id: string; name: string; fieldKey: string; dataType: string }[] }).customFields ?? [];
  const wfList = (workflows.body as { workflows: unknown[] }).workflows ?? [];

  const services = Object.entries(SERVICE_ROUTES).map(([name, route]) => ({
    name,
    calendarId: route.calendarId,
    doctorId: route.doctorId,
    doctorName: userList.find((u) => u.id === route.doctorId)
      ? `${userList.find((u) => u.id === route.doctorId)?.firstName} ${userList.find((u) => u.id === route.doctorId)?.lastName}`
      : undefined,
    calendarName: calList.find((c) => c.id === route.calendarId)?.name,
  }));

  return NextResponse.json({ services, calendars: calList, users: userList, customFields: cfList, workflows: wfList });
}
