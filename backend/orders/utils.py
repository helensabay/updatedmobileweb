# somewhere in your views.py or utils.py
ORDER_STATUS_MAP = {
    "new": "pending",
    "pending": "pending",
    "accepted": "in_prep",
    "in_queue": "in_prep",
    "in_prep": "in_progress",
    "in_progress": "in_progress",
    "assembling": "ready",
    "ready": "ready",
    "staged": "ready",
    "handoff": "ready",
    "completed": "completed",
    "cancelled": "cancelled",
    "voided": "voided",
    "refunded": "refunded",
}

def map_order_status(status):
    """Maps backend status to 5-step frontend status."""
    return ORDER_STATUS_MAP.get(status, status)
