class CropMonitoringAgent:
    """Tracks growth stage, pests, and disease via imagery."""
    def run(self, state):
        # Stub: replace with actual monitoring logic.
        # For now, we return a dummy alert.
        alert = {
            'type': 'growth_stage',
            'stage': 'vegetative',
            'severity': 'low',
            'message': 'Crop is in vegetative stage, normal growth.'
        }
        # We append to monitoring_alerts in the state.
        # Since the node returns a dict to update the state, we will return the alert to be appended.
        # However, the state expects monitoring_alerts to be a list, and we want to append.
        # We'll return a dict with a key that the node will use to update the state by appending.
        # But the node is responsible for updating the state. We'll have the agent return the alert
        # and the node will append it to the existing list.
        return {"monitoring_alert": alert}