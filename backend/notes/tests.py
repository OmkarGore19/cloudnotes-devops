from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from .models import Note

User = get_user_model()


class NotesApiTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.alice = User.objects.create_user(username="alice", email="alice@example.com", password="SecurePass123!")
        cls.bob = User.objects.create_user(username="bob", email="bob@example.com", password="SecurePass123!")

    def setUp(self):
        self.client = APIClient()

    def test_health_endpoint_is_public(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")

    def test_notes_require_authentication(self):
        response = self.client.get("/api/notes/")
        self.assertEqual(response.status_code, 401)

    def test_authenticated_user_can_create_note(self):
        self.client.force_authenticate(user=self.alice)
        response = self.client.post("/api/notes/", {"title": "My note", "content": "First note"}, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertTrue(Note.objects.filter(owner=self.alice, title="My note").exists())

    def test_users_only_see_their_own_notes(self):
        Note.objects.create(owner=self.alice, title="Alice note", content="Private to Alice")
        Note.objects.create(owner=self.bob, title="Bob note", content="Private to Bob")
        self.client.force_authenticate(user=self.alice)
        response = self.client.get("/api/notes/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual([note["title"] for note in response.data], ["Alice note"])

    def test_user_cannot_update_another_users_note(self):
        note = Note.objects.create(owner=self.alice, title="Alice note", content="Private")
        self.client.force_authenticate(user=self.bob)
        response = self.client.patch(f"/api/notes/{note.id}/", {"title": "Hijacked"}, format="json")
        self.assertEqual(response.status_code, 404)
        note.refresh_from_db()
        self.assertEqual(note.title, "Alice note")
