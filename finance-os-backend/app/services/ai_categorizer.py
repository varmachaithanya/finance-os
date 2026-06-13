from typing import Optional

RULES: dict[str, list[str]] = {
    "Food": ["swiggy", "zomato", "restaurant", "food", "cafe", "pizza", "biryani", "hotel", "eat", "lunch", "dinner", "breakfast", "meal", "grocery", "bigbasket", "blinkit", "zepto"],
    "Fuel": ["petrol", "diesel", "fuel", "hp", "iocl", "bharat petroleum", "indian oil", "shell", "cng", "pump"],
    "Travel": ["uber", "ola", "rapido", "auto", "cab", "flight", "airline", "indigo", "bus", "train", "irctc", "metro", "toll", "makemytrip", "goibibo", "redbus"],
    "OTT Subscriptions": ["netflix", "amazon prime", "hotstar", "disney", "spotify", "youtube premium", "zee5", "sonyliv", "apple tv", "prime video"],
    "Shopping": ["amazon", "flipkart", "myntra", "meesho", "ajio", "nykaa", "shopping", "mall", "store", "amazon pay"],
    "Mobile Recharge": ["jio", "airtel", "vi", "bsnl", "recharge", "mobile", "prepaid", "postpaid"],
    "Utilities": ["electricity", "water bill", "gas", "broadband", "wifi", "internet", "act", "hathway", "bsnl broadband"],
    "Medical": ["pharmacy", "hospital", "clinic", "doctor", "medicine", "apollo", "medplus", "1mg", "netmeds", "health"],
    "Entertainment": ["movie", "pvr", "inox", "bookmyshow", "gaming", "game", "concert", "event", "playstation", "xbox"],
}


def suggest_category(description: str) -> Optional[str]:
    if not description:
        return None
    description_lower = description.lower()
    for category, keywords in RULES.items():
        if any(kw in description_lower for kw in keywords):
            return category
    return None
