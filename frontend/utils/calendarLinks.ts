export const formatGoogleCalendarDate = (date: Date) => {
  return date.toISOString().replace(/-|:|\.\d\d\d/g, "");
};

export const formatOutlookCalendarDate = (date: Date) => {
  // Outlook format: YYYY-MM-DDTHH:mm:ssZ
  return date.toISOString().replace(/\.\d\d\d/, "");
};

export const generateGoogleCalendarUrl = (webinar: any) => {
  const start = new Date(webinar.scheduledAt);
  const duration = Number(webinar.duration || 60);
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: webinar.title,
    dates: `${formatGoogleCalendarDate(start)}/${formatGoogleCalendarDate(end)}`,
    details: webinar.description + (webinar.meetingLink ? `\n\nMeeting Link: ${webinar.meetingLink}` : ''),
    location: webinar.meetingLink || 'Online'
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

export const generateOutlookCalendarUrl = (webinar: any) => {
  const start = new Date(webinar.scheduledAt);
  const duration = Number(webinar.duration || 60);
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: webinar.title,
    startdt: formatOutlookCalendarDate(start),
    enddt: formatOutlookCalendarDate(end),
    body: webinar.description + (webinar.meetingLink ? `\n\nMeeting Link: ${webinar.meetingLink}` : ''),
    location: webinar.meetingLink || 'Online'
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};
