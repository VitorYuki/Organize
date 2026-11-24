from django.conf import settings
from django.http import JsonResponse


def private_api(get_response):
    def middleware(request):
        if not request.path.startswith("/api/"):
            return get_response(request)
        try:
            length = int(request.META.get("CONTENT_LENGTH") or 0)
        except ValueError:
            length = -1
        if length > settings.DATA_UPLOAD_MAX_MEMORY_SIZE:
            response = JsonResponse(
                {"detail": "O conteúdo excede o limite permitido."}, status=413
            )
        elif length < 0:
            response = JsonResponse({"detail": "Tamanho da requisição inválido."}, status=400)
        else:
            response = get_response(request)
        response["Cache-Control"] = "private, no-store"
        return response

    return middleware


def csrf_failure(request, reason=""):
    return JsonResponse(
        {"detail": "A sessão de segurança expirou. Atualize a página."}, status=403
    )


def expected_account(get_response):
    """Keep an open editor tied to the account that originally opened it."""

    def middleware(request):
        expected = request.headers.get("X-Organize-User")
        if expected and request.path.startswith("/api/") and request.user.is_authenticated:
            if expected != str(request.user.pk):
                return JsonResponse(
                    {"detail": "A conta ativa mudou. Atualize os dados."}, status=409
                )
        return get_response(request)

    return middleware
