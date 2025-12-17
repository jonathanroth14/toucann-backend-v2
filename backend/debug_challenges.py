"""
Debug script to check challenges in database
"""
import sys
sys.path.insert(0, '/home/user/toucann-backend-v2/backend')

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.common.dependencies import get_db_url

def check_challenges():
    db_url = get_db_url()
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Check if tables exist
        print("=== Checking Database Tables ===\n")
        result = db.execute(text("""
            SELECT table_name
            FROM information_schema.tables
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))
        tables = [row[0] for row in result]
        print(f"Tables found: {', '.join(tables)}\n")

        # Check if new tables exist
        if 'user_challenge_preferences' in tables:
            print("✓ user_challenge_preferences table exists")
        else:
            print("✗ user_challenge_preferences table MISSING - need to run migration 005")

        if 'snoozed_challenges' in tables:
            print("✓ snoozed_challenges table exists")
        else:
            print("✗ snoozed_challenges table MISSING - need to run migration 005")

        print("\n=== Checking Challenges ===\n")

        # Count total challenges
        result = db.execute(text("SELECT COUNT(*) FROM challenges"))
        total = result.scalar()
        print(f"Total challenges in database: {total}")

        if total == 0:
            print("\n❌ NO CHALLENGES FOUND - Run seed script: python seed_onboarding_chain.py\n")
            return

        # Check active and visible challenges
        result = db.execute(text("""
            SELECT COUNT(*)
            FROM challenges
            WHERE is_active = true AND visible_to_students = true
        """))
        active = result.scalar()
        print(f"Active & visible challenges: {active}")

        # List all challenges with details
        result = db.execute(text("""
            SELECT id, title, is_active, visible_to_students, goal_id, next_challenge_id, sort_order
            FROM challenges
            ORDER BY sort_order, id
        """))

        print("\n=== Challenge List ===")
        for row in result:
            print(f"ID: {row[0]}, Title: {row[1]}, Active: {row[2]}, Visible: {row[3]}, Goal: {row[4]}, Next: {row[5]}, Sort: {row[6]}")

        # Check goals
        print("\n=== Checking Goals ===\n")
        result = db.execute(text("SELECT COUNT(*) FROM goals"))
        total_goals = result.scalar()
        print(f"Total goals: {total_goals}")

        if total_goals > 0:
            result = db.execute(text("SELECT id, title, is_active FROM goals ORDER BY id"))
            print("\n=== Goal List ===")
            for row in result:
                print(f"ID: {row[0]}, Title: {row[1]}, Active: {row[2]}")

    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nThis might mean:")
        print("1. Database doesn't exist")
        print("2. Migrations haven't been run")
        print("3. DATABASE_URL is incorrect")
    finally:
        db.close()

if __name__ == "__main__":
    print("Checking challenge database state...\n")
    check_challenges()
