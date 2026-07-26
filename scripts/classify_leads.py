import sys
import json
import math
import re
import os

# Standard list of English/Hindi stop words to ignore during TF-IDF computations
STOP_WORDS = {
    "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", 
    "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she", 
    "her", "hers", "herself", "it", "its", "itself", "they", "them", "their", 
    "theirs", "themselves", "what", "which", "who", "whom", "this", "that", 
    "these", "those", "am", "is", "are", "was", "were", "be", "been", "being", 
    "have", "has", "had", "having", "do", "does", "did", "doing", "a", "an", 
    "the", "and", "but", "if", "or", "because", "as", "until", "while", "of", 
    "at", "by", "for", "with", "about", "against", "between", "into", "through", 
    "during", "before", "after", "above", "below", "to", "from", "up", "down", 
    "in", "out", "on", "off", "over", "under", "again", "further", "then", "once",
    "ka", "ki", "ke", "ko", "se", "aur", "hi", "hai", "hu", "tha", "thi", "the"
}

def clean_and_tokenize(text):
    """Normalize text: lower-case, remove non-alphanumeric chars, split by word."""
    if not text:
        return []
    text = text.lower()
    words = re.findall(r'[a-z0-9]+', text)
    return [w for w in words if w not in STOP_WORDS and len(w) > 1]

class PureNLPClassifier:
    def __init__(self):
        self.class_counts = {}
        self.class_word_counts = {}
        self.vocabulary = set()
        self.word_counts_per_class = {}
        self.idf = {}
        self.doc_count = 0

    def train(self, samples):
        """Train Naive Bayes + TF-IDF on training samples."""
        self.doc_count = len(samples)
        
        # Count documents per class for IDF calculations
        doc_occurrences = {}
        
        for sample in samples:
            text = sample["text"]
            label = sample["label"]
            
            # Initialise structures
            if label not in self.class_counts:
                self.class_counts[label] = 0
                self.class_word_counts[label] = 0
                self.word_counts_per_class[label] = {}
                
            self.class_counts[label] += 1
            
            # Tokenize & Count words
            tokens = clean_and_tokenize(text)
            unique_tokens = set(tokens)
            
            # Track document frequencies for IDF
            for token in unique_tokens:
                doc_occurrences[token] = doc_occurrences.get(token, 0) + 1
                
            for token in tokens:
                self.vocabulary.add(token)
                self.class_word_counts[label] += 1
                self.word_counts_per_class[label][token] = self.word_counts_per_class[label].get(token, 0) + 1
                
        # Calculate IDF values
        for token, count in doc_occurrences.items():
            self.idf[token] = math.log((self.doc_count + 1) / (count + 1)) + 1.0

    def predict(self, text):
        """Perform Multinomial Naive Bayes classification with TF-IDF weighting."""
        tokens = clean_and_tokenize(text)
        if not tokens:
            # Fallback to general inquiry if no keywords match vocabulary
            return "GENERAL_INQUIRY", 0.5, {}

        # Fallback to general inquiry if all words are unseen in training vocabulary
        has_known_token = any(token in self.vocabulary for token in tokens)
        if not has_known_token:
            return "GENERAL_INQUIRY", 0.5, {}

        scores = {}
        total_docs = sum(self.class_counts.values())
        vocab_size = len(self.vocabulary)

        for label, class_doc_count in self.class_counts.items():
            # Prior probability log P(C_k)
            prior_prob = class_doc_count / total_docs
            log_prob = math.log(prior_prob)
            
            # Count terms in this class
            total_class_words = self.class_word_counts[label]
            
            for token in tokens:
                if token in self.vocabulary:
                    # Term frequency in this class with Laplace smoothing (alpha = 1)
                    word_freq = self.word_counts_per_class[label].get(token, 0)
                    tf_idf_weight = self.idf.get(token, 1.0)
                    
                    # Compute conditional probability with TF-IDF weight scaling
                    cond_prob = (word_freq + 1) / (total_class_words + vocab_size)
                    log_prob += tf_idf_weight * math.log(cond_prob)
                else:
                    # Unseen word probability
                    log_prob += math.log(1 / (total_class_words + vocab_size))
                    
            scores[label] = log_prob

        # Normalise log probabilities to get pseudo-probabilities (Softmax style)
        max_log = max(scores.values())
        exp_scores = {l: math.exp(v - max_log) for l, v in scores.items()}
        sum_exp = sum(exp_scores.values())
        probabilities = {l: (v / sum_exp) for l, v in exp_scores.items()}
        
        best_label = max(probabilities, key=probabilities.get)
        best_prob = probabilities[best_label]
        
        return best_label, best_prob, probabilities

def check_for_loops(history, current_node):
    """Detect if client is repeatedly looping through menus/nodes."""
    if not history:
        return False, 0
        
    combined_nodes = list(history)
    if current_node:
        combined_nodes.append(current_node)
        
    # Check frequency of each node
    node_counts = {}
    for node in combined_nodes:
        if node and node != '6206': # Ignore welcome node
            node_counts[node] = node_counts.get(node, 0) + 1
            
    max_repetition = max(node_counts.values()) if node_counts else 0
    is_looping = max_repetition >= 3
    return is_looping, max_repetition

def calculate_score_and_temp(intent, text, probability, flow_node, is_looping):
    """Logic to derive Lead Score and Temperature based on intent and interactions."""
    score = 50
    temp = "warm"
    
    # 1. Base Score on ML Intent Prediction
    intent_scores = {
        "WEBSITE_DEV": 80,
        "CRM_INQUIRY": 85,
        "DIGITAL_MARKETING": 75,
        "GENERAL_INQUIRY": 45,
        "SPAM": 5
    }
    score = intent_scores.get(intent, 50)
    
    # 2. Adjust based on specific high-intent keywords
    lowered_text = text.lower()
    pricing_keywords = ["price", "cost", "budget", "pricing", "how much", "rate", "packages", "charges", "charges?", "charges? wa"]
    if any(k in lowered_text for k in pricing_keywords):
        score += 15
        
    urgent_keywords = ["urgent", "immediately", "asap", "quick", "today", "call me", "call"]
    if any(k in lowered_text for k in urgent_keywords):
        score += 10

    # 3. Boost based on Flow Node mapping
    if flow_node == '6232': # Requested callback/contact
        score = max(score, 95)
        temp = "hot"
    elif flow_node in ['6225', '6226', '6227', '6228', '6229', '6230']: # Pricing node
        score = max(score, 75)
        
    # 4. Set Lead Temperature thresholds
    if score >= 80:
        temp = "hot"
    elif score <= 20:
        temp = "cold"
    else:
        temp = "warm"
        
    # 5. Handle special loop flags
    if is_looping:
        # Loop indicates high curiosity but stuck behaviour, classify as warm/hot but flag it
        temp = "warm"
        
    # Cap score
    score = max(0, min(100, score))
    return score, temp

def main():
    # Fallback default payload
    input_payload = {
        "message": "Hi, I am looking for a website design company",
        "phone": "9999999999",
        "flow_node": "6206",
        "history": []
    }
    
    # Try reading command-line arguments or stdin
    if len(sys.argv) > 1:
        try:
            input_payload = json.loads(sys.argv[1])
        except Exception:
            pass
    elif not sys.stdin.isatty():
        try:
            input_payload = json.loads(sys.stdin.read())
        except Exception:
            pass

    # Read training dataset
    script_dir = os.path.dirname(os.path.abspath(__file__))
    dataset_path = os.path.join(script_dir, "data", "training_data.json")
    
    samples = []
    if os.path.exists(dataset_path):
        try:
            with open(dataset_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                samples = data.get("samples", [])
        except Exception as e:
            sys.stderr.write(f"Error loading training data: {e}\n")
            
    # Default fallback data if file missing or corrupted
    if not samples:
        samples = [
            { "text": "hi", "label": "GENERAL_INQUIRY" },
            { "text": "website price", "label": "WEBSITE_DEV" },
            { "text": "need crm integration", "label": "CRM_INQUIRY" },
            { "text": "seo optimization marketing", "label": "DIGITAL_MARKETING" },
            { "text": "claim free money spam", "label": "SPAM" }
        ]

    # Run classifier
    classifier = PureNLPClassifier()
    classifier.train(samples)
    
    message_text = input_payload.get("message", "")
    phone = input_payload.get("phone", "")
    current_node = input_payload.get("flow_node", "")
    history = input_payload.get("history", [])

    predicted_intent, probability, all_probs = classifier.predict(message_text)
    
    # Loop check
    is_looping, max_repetition = check_for_loops(history, current_node)
    
    # Score & Temperature calculation
    score, temp = calculate_score_and_temp(predicted_intent, message_text, probability, current_node, is_looping)
    
    # Formulate summary
    mapped_intents = {
        "WEBSITE_DEV": "Website Development Inquiry",
        "CRM_INQUIRY": "CRM Software / Integration",
        "DIGITAL_MARKETING": "SEO & Digital Marketing",
        "GENERAL_INQUIRY": "General Inquiry / Welcome Flow",
        "SPAM": "Spam / Unsolicited Message"
    }
    
    intent_desc = mapped_intents.get(predicted_intent, "General Inquiry")
    
    summary = f"Customer message indicates a {intent_desc}."
    if current_node and current_node != "6206":
        summary += f" Interacted with WhatsApp node {current_node}."
    if is_looping:
        summary += f" WARNING: Customer is looping on menu node {current_node} ({max_repetition} times)."

    suggested_action = "Call within 24 hours"
    if temp == "hot":
        suggested_action = "Send quotation & call immediately"
    elif predicted_intent == "SPAM":
        suggested_action = "Archive / Ignore conversation"
    elif is_looping:
        suggested_action = "Intervene manually - client is stuck in menu"

    output_result = {
        "intent": predicted_intent,
        "probability": round(probability, 4),
        "score": score,
        "leadTemperature": temp,
        "summary": summary,
        "suggestedAction": suggested_action,
        "metadata": {
            "looping_detected": is_looping,
            "max_repetition": max_repetition,
            "flow_node": current_node
        }
    }
    
    # Output to stdout
    print(json.dumps(output_result, indent=2))

if __name__ == "__main__":
    main()
