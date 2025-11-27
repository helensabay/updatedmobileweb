from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import MenuItem
from .serializers import MenuItemSerializer


@api_view(['GET'])
@permission_classes([AllowAny])
def menu_items(request):
    items = MenuItem.objects.filter(archived=False)
    serializer = MenuItemSerializer(items, many=True)
    return Response(serializer.data)
@api_view(['GET'])
@permission_classes([AllowAny])
def menu_item_detail(request, item_id):
    try:
        item = MenuItem.objects.get(id=item_id, archived=False)
    except MenuItem.DoesNotExist:
        return Response({'error': 'Item not found'}, status=404)
    serializer = MenuItemSerializer(item)
    return Response(serializer.data)
@api_view(['GET'])
@permission_classes([AllowAny])
def menu_item_availability(request, item_id):
    try:
        item = MenuItem.objects.get(id=item_id, archived=False)
    except MenuItem.DoesNotExist:
        return Response({'error': 'Item not found'}, status=404)
    return Response({'id': item.id, 'name': item.name, 'available': item.available})

@api_view(['GET'])
@permission_classes([AllowAny])
def menu_item_image(request, item_id):
    try:
        item = MenuItem.objects.get(id=item_id, archived=False)
    except MenuItem.DoesNotExist:
        return Response({'error': 'Item not found'}, status=404)
    if not item.image:
        return Response({'error': 'No image found'}, status=404)
    return Response({'image_url': item.image.url})
from .models import MenuCategory
from .serializers import MenuCategorySerializer

@api_view(['GET'])
@permission_classes([AllowAny])
def categories_list(request):
    categories = MenuCategory.objects.all()
    serializer = MenuCategorySerializer(categories, many=True)
    return Response(serializer.data)