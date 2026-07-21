import { BhashMappedNodeResult } from "../../types/bhash";

export function mapBhashNodeToCRM(nodeId: string, buttonTitle?: string | null): BhashMappedNodeResult {
  const node = String(nodeId).trim();

  // 1. Welcome Node (6206)
  if (node === '6206') {
    return {
      eventType: 'welcome_started',
      eventTitle: 'Welcome Flow Started',
      eventDescription: 'Lead initiated conversation and received welcome message.',
      leadStatusUpdate: 'new',
      isContactRequested: false,
    };
  }

  // 2. Explore Services (6207)
  if (node === '6207') {
    return {
      eventType: 'explored_services',
      eventTitle: 'Explored Services',
      eventDescription: 'Lead clicked Explore Services in WhatsApp menu.',
      isContactRequested: false,
    };
  }

  // 3. Service Details Nodes (6208 - 6213)
  const serviceMap: Record<string, string> = {
    '6208': 'Web Development',
    '6209': 'Mobile App Development',
    '6210': 'SEO & Growth',
    '6211': 'AI Solutions',
    '6212': 'Digital Marketing',
    '6213': 'Branding & Strategy',
  };

  if (serviceMap[node]) {
    const serviceName = serviceMap[node];
    return {
      eventType: 'viewed_service_details',
      eventTitle: `Viewed Service: ${serviceName}`,
      eventDescription: `Lead selected ${serviceName} from services list.`,
      serviceInterest: serviceName,
      isContactRequested: false,
    };
  }

  // 4. Detailed Information (6219 - 6224)
  const nodeNum = parseInt(node, 10);
  if (nodeNum >= 6219 && nodeNum <= 6224) {
    return {
      eventType: 'viewed_detailed_info',
      eventTitle: 'Viewed Detailed Information',
      eventDescription: `Lead inspected detailed technical specs at Node ${node}.`,
      isContactRequested: false,
    };
  }

  // 5. Pricing Nodes (6225 - 6230)
  if (nodeNum >= 6225 && nodeNum <= 6230) {
    return {
      eventType: 'viewed_pricing',
      eventTitle: 'Viewed Pricing',
      eventDescription: `Lead requested package pricing breakdown at Node ${node}.`,
      leadStatusUpdate: 'nurturing',
      isContactRequested: false,
    };
  }

  // 6. Portfolio Node (6231)
  if (node === '6231') {
    return {
      eventType: 'visited_portfolio',
      eventTitle: 'Visited Portfolio',
      eventDescription: 'Lead requested portfolio and case study showcases.',
      isContactRequested: false,
    };
  }

  // 7. Contact Confirmation Node (6232) -> CRITICAL TRIGGER
  if (node === '6232') {
    return {
      eventType: 'requested_contact',
      eventTitle: 'Requested Contact / Callback',
      eventDescription: 'Lead completed WhatsApp flow and requested direct agent consultation.',
      leadStatusUpdate: 'Interested',
      isContactRequested: true,
    };
  }

  // Fallback for custom or unmapped nodes
  return {
    eventType: 'navigated_flow_node',
    eventTitle: `Navigated to Node ${node}`,
    eventDescription: buttonTitle ? `Clicked: "${buttonTitle}"` : `Navigated inside flow to Node ${node}`,
    isContactRequested: false,
  };
}
