// Smart template generator for different SaaS types
import { generatePremiumTaskManagerTurso } from './templates-premium-turso';

export function selectTemplate(description: string): string {
  const desc = description.toLowerCase();
  
  // Task/Todo/Project Management
  if (desc.match(/task|todo|project|manage|organize|checklist|priority/)) {
    return 'task-manager';
  }
  
  // Fitness/Health/Workout
  if (desc.match(/workout|fitness|exercise|health|gym|training|goal|weight/)) {
    return 'fitness';
  }
  
  // CRM/Contacts/Customers
  if (desc.match(/crm|customer|contact|client|lead|sales|deal/)) {
    return 'crm';
  }
  
  // Analytics/Dashboard/Metrics
  if (desc.match(/analytics|dashboard|metric|chart|report|stat|track/)) {
    return 'analytics';
  }
  
  // Notes/Wiki/Documentation
  if (desc.match(/note|wiki|document|knowledge|write|blog|content/)) {
    return 'notes';
  }
  
  // Default to task manager for generic descriptions
  return 'task-manager';
}

export function generateTemplate(templateType: string, name: string, description: string, price: string) {
  const generators: Record<string, Function> = {
    'task-manager': generatePremiumTaskManagerTurso,
    'fitness': generatePremiumTaskManagerTurso,
    'crm': generatePremiumTaskManagerTurso,
    'analytics': generatePremiumTaskManagerTurso,
    'notes': generatePremiumTaskManagerTurso,
  };
  
  const generator = generators[templateType] || generatePremiumTaskManagerTurso;
  return generator(name, description, price);
}
