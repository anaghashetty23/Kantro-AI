import { GoogleGenAI } from '@google/genai';
import { db } from './db.ts';

let aiClient: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  aiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

export interface AssistantMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  message: string;
  suggestedItems?: {
    id: string;
    name: string;
    price: number;
    prepTime: number;
    category: string;
    reason?: string;
  }[];
  suggestedPickupTime?: string;
}

export async function askKantroAssistant(params: {
  prompt: string;
  history?: AssistantMessage[];
  studentBreak?: { start: string; end: string; preferred?: string };
}): Promise<AIResponse> {
  const { prompt, history = [], studentBreak } = params;

  // Retrieve live menu items from DB
  const menuItems = db.prepare(`
    SELECT m.id, m.name, m.description, m.price, m.prep_time_minutes, m.is_available, c.name as category_name
    FROM menu_items m
    JOIN categories c ON m.category_id = c.id
    ORDER BY c.display_order ASC, m.price ASC
  `).all() as any[];

  // Retrieve current active orders count to reflect kitchen busyness
  const activeCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM orders 
    WHERE order_status IN ('confirmed', 'accepted', 'preparing')
  `).get() as { cnt: number };

  // Prepare fallback rule-based engine first
  const fallbackResponse = generateDeterministicRecommendation({
    prompt,
    menuItems,
    studentBreak,
    activeCount: activeCount.cnt
  });

  if (!process.env.GEMINI_API_KEY || !aiClient) {
    return fallbackResponse;
  }

  try {
    const availableItems = menuItems.filter(i => i.is_available === 1);
    const systemPrompt = `You are "KANTRO AI Assistant", the friendly, lightning-fast college canteen assistant for the KANTRO AI pre-ordering web application.
Tagline: "Your Break, Your Food, Your Time."

Your job:
1. Help students plan orders around their class breaks and timetable.
2. Recommend ONLY food items from the official live canteen menu provided below. NEVER invent items, prices, or prep times.
3. Keep answers concise, clear, and focused on helping the student make a quick decision.
4. Always list prices in Indian Rupees (₹) and preparation times in minutes.
5. If the user mentions a short break (e.g. 10 or 15 minutes) or a tight budget (e.g. under ₹50), recommend items whose preparation time comfortably fits within their window.
6. When suggesting items, mention why they fit (e.g. fast prep, filling meal, budget-friendly).

Live Canteen Menu:
${availableItems.map(i => `- [${i.id}] ${i.name} (${i.category_name}): ₹${i.price}, Prep: ${i.prep_time_minutes} min. Desc: ${i.description}`).join('\n')}

Current Kitchen Active Orders: ${activeCount.cnt} active orders right now.
${studentBreak?.start ? `Student Break window: ${studentBreak.start} to ${studentBreak.end} (Preferred pickup: ${studentBreak.preferred || 'Not selected'})` : 'Student has not specified break times yet.'}

Output Format:
Provide a natural, helpful reply in 2-4 short paragraphs or bullet points.
At the very end of your response, on a new line, include a JSON block with recommended item IDs so the app can render "Add to Cart" action buttons:
\`\`\`json
{
  "recommendedItemIds": ["m_idli_2", "m_tea"],
  "suggestedPickupTime": "12:45 PM"
}
\`\`\`
If no specific items are recommended, omit or pass empty array.`;

    const chatMessages = history.slice(-4).map(m => `${m.role === 'user' ? 'Student' : 'Assistant'}: ${m.content}`).join('\n');
    const fullUserPrompt = chatMessages ? `${chatMessages}\nStudent: ${prompt}` : `Student: ${prompt}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `${systemPrompt}\n\n${fullUserPrompt}` }] }
      ]
    });

    const replyText = response.text || '';
    
    // Extract JSON block if present
    let jsonMatch = replyText.match(/```json\s*([\s\S]*?)\s*```/);
    let recommendedIds: string[] = [];
    let suggestedPickupTime: string | undefined = undefined;

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (Array.isArray(parsed.recommendedItemIds)) {
          recommendedIds = parsed.recommendedItemIds;
        }
        if (parsed.suggestedPickupTime) {
          suggestedPickupTime = parsed.suggestedPickupTime;
        }
      } catch (e) {
        // Ignore json parse error
      }
    }

    // Clean reply text of json block for display
    const cleanText = replyText.replace(/```json[\s\S]*?```/g, '').trim();

    // Map recommended IDs to menu objects
    const suggestedItems = recommendedIds.map(id => {
      const item = availableItems.find(m => m.id === id);
      if (!item) return null;
      return {
        id: item.id,
        name: item.name,
        price: item.price,
        prepTime: item.prep_time_minutes,
        category: item.category_name
      };
    }).filter(Boolean) as any[];

    return {
      message: cleanText || fallbackResponse.message,
      suggestedItems: suggestedItems.length > 0 ? suggestedItems : fallbackResponse.suggestedItems,
      suggestedPickupTime: suggestedPickupTime || fallbackResponse.suggestedPickupTime
    };
  } catch (error) {
    console.error('Gemini API call failed, using deterministic fallback:', error);
    return fallbackResponse;
  }
}

function generateDeterministicRecommendation(params: {
  prompt: string;
  menuItems: any[];
  studentBreak?: { start: string; end: string; preferred?: string };
  activeCount: number;
}): AIResponse {
  const q = params.prompt.toLowerCase();
  const available = params.menuItems.filter(i => i.is_available === 1);

  // Check budget filter: under ₹50 or ₹100
  const budgetMatch = q.match(/under\s*(?:rs\.?|₹)?\s*(\d+)/i) || q.match(/less\s*than\s*(?:rs\.?|₹)?\s*(\d+)/i);
  const maxBudget = budgetMatch ? parseInt(budgetMatch[1], 10) : null;

  // Check time filter: e.g. 10 min, 15 min, 5 min
  const timeMatch = q.match(/(\d+)\s*(?:min|mins|minute|minutes)/i);
  const maxTime = timeMatch ? parseInt(timeMatch[1], 10) : null;

  if (q.includes('menu') || q.includes('what do you have') || q.includes('options')) {
    const samples = available.slice(0, 6);
    return {
      message: `Here is a glance at our popular canteen items today! We have South Indian tiffin, wholesome rice meals, fresh snacks, and hot/cold beverages. You can also view the Full Menu tab anytime.`,
      suggestedItems: samples.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        prepTime: i.prep_time_minutes,
        category: i.category_name
      }))
    };
  }

  if (maxTime && maxTime <= 10) {
    // Quick items <= 5 mins prep
    const fastItems = available.filter(i => i.prep_time_minutes <= 5);
    return {
      message: `You have a quick ${maxTime}-minute break! Here are items prepared in 5 minutes or less so you can pick them up without delay:`,
      suggestedItems: fastItems.slice(0, 4).map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        prepTime: i.prep_time_minutes,
        category: i.category_name,
        reason: `Quick prep: ${i.prep_time_minutes} min`
      }))
    };
  }

  if (maxBudget) {
    const budgetItems = available.filter(i => i.price <= maxBudget);
    return {
      message: `Here are tasty options under ₹${maxBudget} that fit your college budget:`,
      suggestedItems: budgetItems.slice(0, 4).map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        prepTime: i.prep_time_minutes,
        category: i.category_name,
        reason: `Budget friendly: ₹${i.price}`
      }))
    };
  }

  if (q.includes('dosa') || q.includes('south indian')) {
    const dosas = available.filter(i => i.category_name === 'South Indian');
    return {
      message: `Craving South Indian delicacies? Our kitchen prepares fresh tiffin to order. The Masala Dosa paired with hot filter coffee is our most popular college combination!`,
      suggestedItems: dosas.slice(0, 3).map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        prepTime: i.prep_time_minutes,
        category: i.category_name
      }))
    };
  }

  if (q.includes('lunch') || q.includes('meal') || q.includes('rice') || q.includes('heavy')) {
    const meals = available.filter(i => i.category_name === 'Meals and Rice');
    return {
      message: `Looking for a satisfying lunch? Our South Indian Meals and Veg Fried Rice provide energy for your afternoon lectures:`,
      suggestedItems: meals.slice(0, 3).map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        prepTime: i.prep_time_minutes,
        category: i.category_name
      }))
    };
  }

  if (q.includes('combo') || q.includes('snack') || q.includes('coffee') || q.includes('tea')) {
    const combo = [
      available.find(i => i.id === 'm_masala_dosa') || available[0],
      available.find(i => i.id === 'm_coffee') || available[1]
    ].filter(Boolean);
    return {
      message: `The classic student combo: Hot Masala Dosa with aromatic South Indian Filter Coffee. Total prep takes under 10 minutes!`,
      suggestedItems: combo.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        prepTime: i.prep_time_minutes,
        category: i.category_name
      }))
    };
  }

  // Default helpful recommendation
  const popular = [
    available.find(i => i.id === 'm_masala_dosa'),
    available.find(i => i.id === 'm_idli_2'),
    available.find(i => i.id === 'm_veg_sandwich'),
    available.find(i => i.id === 'm_cold_coffee')
  ].filter(Boolean);

  return {
    message: `Welcome to KANTRO AI! Based on current kitchen prep load (${params.activeCount} active orders), our South Indian and Snacks counters are operating smoothly. Let me know your break window, budget, or food craving!`,
    suggestedItems: popular.map(i => ({
      id: i!.id,
      name: i!.name,
      price: i!.price,
      prepTime: i!.prep_time_minutes,
      category: i!.category_name
    }))
  };
}
