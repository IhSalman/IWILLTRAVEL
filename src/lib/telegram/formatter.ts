import type { FinalItinerary, FinalDay } from '@/app/api/agent-itinerary/types';

export function formatItineraryForTelegram(itinerary: FinalItinerary): string {
    let text = `🌍 *${itinerary.title}*\n\n`;
    text += `📝 *Overview*\n${itinerary.overview}\n\n`;
    text += `✨ *Why this plan?*\n${itinerary.whyThisPlan.map(tip => `• ${tip}`).join('\n')}\n\n`;

    itinerary.days.forEach((day: FinalDay) => {
        text += `📅 *Day ${day.day}: ${day.theme}*\n`;
        text += `📍 Area: ${day.areaFocus} | Pace: ${day.pace}\n\n`;
        
        day.activities.forEach(activity => {
            text += `🕒 *${activity.time}* - ${activity.title}\n`;
            text += `${activity.description}\n`;
            if (activity.tip) text += `💡 _Tip: ${activity.tip}_\n`;
            text += `\n`;
        });
        text += `--- \n`;
    });

    text += `💰 *Budget Tips*\n${itinerary.budgetTips.slice(0, 3).map(tip => `• ${tip}`).join('\n')}\n\n`;
    text += `🛡️ *Safety*\n${itinerary.safetyAdvice[0]}\n\n`;
    text += `💡 Get the full interactive experience at [iWillTravel](https://wanderplan.ai)`;

    return text;
}
