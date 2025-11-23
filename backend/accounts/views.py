from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework_simplejwt.tokens import RefreshToken
from api.models import AppUser
from rest_framework.decorators import api_view, permission_classes
import base64
from .serializers import RegisterSerializer
from django.contrib.auth.hashers import make_password

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_avatar(request):
    user = request.user

    avatar_data = request.data.get('avatar')

    if not avatar_data:
        return Response({'error': 'Avatar image is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # avatar will be saved in MEDIA folder
        format, imgstr = avatar_data.split(';base64,')
        ext = format.split('/')[-1]

        filename = f"user_{user.id}_avatar.{ext}"

        file_path = f"avatars/{filename}"

        # Save the image
        with open(f"media/{file_path}", "wb") as f:
            f.write(base64.b64decode(imgstr))

        # Save to the user avatar field
        user.avatar = file_path
        user.save()

        return Response({
            "message": "Avatar updated successfully",
            "avatar_url": user.avatar.url
        }, status=status.HTTP_200_OK)

    except Exception as e:
        return Response({"error": str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response({"success": True, "message": "Account created successfully"}, status=201)
        return Response({"success": False, "errors": serializer.errors}, status=400)
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    new_password = request.data.get('password')

    if not new_password or len(new_password) < 6:
        return Response({'error': 'Password must be at least 6 characters.'}, status=status.HTTP_400_BAD_REQUEST)

    user.password = make_password(new_password)
    user.save()
    return Response({'success': True, 'message': 'Password changed successfully!'}, status=status.HTTP_200_OK)
class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get("email")
        password = request.data.get("password")

        if not email or not password:
            return Response({"detail": "Email and password are required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = AppUser.objects.get(email=email)
        except AppUser.DoesNotExist:
            return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        if not user.check_password(password):
            return Response({"detail": "Invalid credentials"}, status=status.HTTP_401_UNAUTHORIZED)

        refresh = RefreshToken.for_user(user)
        return Response({
            "refresh": str(refresh),
            "access": str(refresh.access_token),
        })


class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        return Response({
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "role": user.role,
            "status": user.status,
            "credit_points": user.credit_points,
            "avatar": user.avatar,
            "phone": user.phone,
        })
