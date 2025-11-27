from rest_framework import generics, permissions
from api.models import CateringEvent
from .serializers import CateringEventSerializer
from .serializers import CateringEventSerializer
from rest_framework import viewsets

class CateringEventViewSet(viewsets.ModelViewSet):
    queryset = CateringEvent.objects.all()
    serializer_class = CateringEventSerializer

class CateringEventListCreateView(generics.ListCreateAPIView):
    queryset = CateringEvent.objects.all()
    serializer_class = CateringEventSerializer
    permission_classes = [permissions.IsAuthenticated]  # adjust if needed

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)
