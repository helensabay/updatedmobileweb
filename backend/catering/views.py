from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import permissions
from api.models import CateringEvent
from .serializers import CateringEventSerializer

class CateringEventViewSet(viewsets.ModelViewSet):
    queryset = CateringEvent.objects.all()
    serializer_class = CateringEventSerializer
    permission_classes = [permissions.IsAuthenticated]  # adjust if needed

    # Override create to attach created_by
    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    # Custom endpoint: /api/catering-events/user-events/<username>/
    @action(detail=False, methods=['get'], url_path='user-events/(?P<username>[^/.]+)')
    def user_events(self, request, username=None):
        events = CateringEvent.objects.filter(client_name=username).order_by('event_date')
        serializer = CateringEventSerializer(events, many=True)
        return Response(serializer.data)
