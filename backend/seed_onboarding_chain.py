"""
Seed script for onboarding challenge chain

Creates the following chain:
1. "Add one target school"
2. "Add GPA + Grad year"
3. "Pick SAT goal"
4. "Complete profile"
5. "Do first SAT mini challenge"

To run: python seed_onboarding_chain.py
"""

import sys
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, '/home/user/toucann-backend-v2/backend')

from app.challenges.models import Challenge, Objective
from app.goals.models import Goal
from app.common.dependencies import get_db_url


def seed_onboarding_chain():
    # Create database connection
    db_url = get_db_url()
    engine = create_engine(db_url)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    db = SessionLocal()

    try:
        # Create or get the onboarding goal
        goal = db.query(Goal).filter(Goal.title == "Student Onboarding").first()

        if not goal:
            goal = Goal(
                title="Student Onboarding",
                description="Get started with your college prep journey by setting up your profile and goals",
                is_active=True,
                created_at=datetime.utcnow()
            )
            db.add(goal)
            db.flush()
            print(f"Created goal: {goal.title}")
        else:
            print(f"Using existing goal: {goal.title}")

        # Define the challenge chain
        challenges_data = [
            {
                "title": "Add one target school",
                "description": "Tell us about one school you're interested in. This helps us personalize your college prep journey.",
                "category": "Profile",
                "points": 50,
                "objectives": [
                    {"title": "Search for a college or university", "points": 10, "sort_order": 0},
                    {"title": "Add it to your target schools list", "points": 20, "sort_order": 1},
                    {"title": "Review your target schools", "points": 20, "sort_order": 2},
                ]
            },
            {
                "title": "Add GPA + Grad year",
                "description": "Let us know your current GPA and expected graduation year so we can recommend appropriate schools and timeline.",
                "category": "Profile",
                "points": 30,
                "objectives": [
                    {"title": "Enter your current GPA", "points": 15, "sort_order": 0},
                    {"title": "Enter your expected graduation year", "points": 15, "sort_order": 1},
                ]
            },
            {
                "title": "Pick SAT goal",
                "description": "Set your target SAT score based on your dream schools' requirements. We'll help you create a study plan to reach it.",
                "category": "Testing",
                "points": 40,
                "objectives": [
                    {"title": "Review SAT score ranges for your target schools", "points": 10, "sort_order": 0},
                    {"title": "Set your target SAT score", "points": 20, "sort_order": 1},
                    {"title": "Choose your test date (if known)", "points": 10, "sort_order": 2},
                ]
            },
            {
                "title": "Complete profile",
                "description": "Finish setting up your profile with additional details to get the most personalized recommendations.",
                "category": "Profile",
                "points": 35,
                "objectives": [
                    {"title": "Add your extracurricular activities", "points": 15, "sort_order": 0},
                    {"title": "List any honors or awards", "points": 10, "sort_order": 1},
                    {"title": "Review and confirm your profile", "points": 10, "sort_order": 2},
                ]
            },
            {
                "title": "Do first SAT mini challenge",
                "description": "Test your skills with a quick 5-minute SAT practice challenge. This helps us understand your current level.",
                "category": "SAT Prep",
                "points": 100,
                "objectives": [
                    {"title": "Complete 5 SAT math questions", "points": 50, "sort_order": 0},
                    {"title": "Complete 5 SAT reading questions", "points": 50, "sort_order": 1},
                ]
            },
        ]

        created_challenges = []

        for i, challenge_data in enumerate(challenges_data):
            # Check if challenge already exists
            existing = db.query(Challenge).filter(
                Challenge.title == challenge_data["title"],
                Challenge.goal_id == goal.id
            ).first()

            if existing:
                print(f"Challenge '{challenge_data['title']}' already exists, skipping...")
                created_challenges.append(existing)
                continue

            # Create challenge
            challenge = Challenge(
                title=challenge_data["title"],
                description=challenge_data["description"],
                category=challenge_data["category"],
                points=challenge_data["points"],
                goal_id=goal.id,
                is_active=True,
                visible_to_students=True,
                sort_order=i,
                created_at=datetime.utcnow()
            )
            db.add(challenge)
            db.flush()
            print(f"Created challenge {i+1}: {challenge.title}")

            # Create objectives for this challenge
            for obj_data in challenge_data["objectives"]:
                objective = Objective(
                    challenge_id=challenge.id,
                    title=obj_data["title"],
                    points=obj_data["points"],
                    sort_order=obj_data["sort_order"],
                    is_required=True
                )
                db.add(objective)

            print(f"  Added {len(challenge_data['objectives'])} objectives")
            created_challenges.append(challenge)

        # Link challenges in chain
        print("\nLinking challenges in chain...")
        for i in range(len(created_challenges) - 1):
            current = created_challenges[i]
            next_challenge = created_challenges[i + 1]

            current.next_challenge_id = next_challenge.id
            print(f"  {current.title} -> {next_challenge.title}")

        db.commit()
        print("\n✅ Onboarding challenge chain created successfully!")
        print(f"\nChain: {' -> '.join(c.title for c in created_challenges)}")

    except Exception as e:
        db.rollback()
        print(f"\n❌ Error: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    print("Seeding onboarding challenge chain...\n")
    seed_onboarding_chain()
