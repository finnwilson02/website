import pytest
import json
import sys
import os

# Add the parent directory to the path so we can import server logic
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def derive_skills_from_projects(projects):
    """Python implementation of deriveSkillsFromProjects for testing."""
    skill_map = {}
    
    if not isinstance(projects, list):
        return skill_map
    
    for project in projects:
        if 'id' in project and 'skills' in project:
            # Handle both array and comma-separated string formats
            skills_array = []
            if isinstance(project['skills'], list):
                skills_array = project['skills']
            elif isinstance(project['skills'], str):
                skills_array = [s.strip() for s in project['skills'].split(',') if s.strip()]
            
            for skill in skills_array:
                if skill not in skill_map:
                    skill_map[skill] = []
                if project['id'] not in skill_map[skill]:
                    skill_map[skill].append(project['id'])
    
    return skill_map


def update_cv_skills_cache(cv_skills, projects):
    """Python implementation of updateCvSkillsCache logic for testing."""
    # Derive skills from projects
    derived_skill_map = derive_skills_from_projects(projects)
    
    # Ensure all required fields exist
    if 'uncategorized' not in cv_skills:
        cv_skills['uncategorized'] = []
    if 'allSkillsCache' not in cv_skills:
        cv_skills['allSkillsCache'] = []
    
    # Get all manual skills
    manual_skills = set()
    duplicate_count = 0
    
    # Add projects field to existing manual skills
    for category in ['programming', 'software', 'technical']:
        if category in cv_skills and isinstance(cv_skills[category], list):
            updated_skills = []
            for skill in cv_skills[category]:
                if isinstance(skill, str):
                    manual_skills.add(skill)
                    updated_skills.append({
                        'name': skill,
                        'projects': derived_skill_map.get(skill, [])
                    })
                elif isinstance(skill, dict) and 'name' in skill:
                    manual_skills.add(skill['name'])
                    # Update projects for existing skill objects
                    skill['projects'] = derived_skill_map.get(skill['name'], [])
                    updated_skills.append(skill)
                else:
                    updated_skills.append(skill)
            cv_skills[category] = updated_skills
    
    # Add new derived skills to uncategorized (avoiding duplicates)
    for skill, project_ids in derived_skill_map.items():
        if skill not in manual_skills:
            # Check if already in uncategorized
            existing_index = None
            for i, s in enumerate(cv_skills['uncategorized']):
                if isinstance(s, dict) and s.get('name') == skill:
                    existing_index = i
                    break
            
            if existing_index is None:
                cv_skills['uncategorized'].append({
                    'name': skill,
                    'projects': project_ids
                })
            else:
                # Update existing uncategorized skill's projects
                cv_skills['uncategorized'][existing_index]['projects'] = project_ids
                duplicate_count += 1
        else:
            duplicate_count += 1
    
    # Build allSkillsCache - sorted unique array of all skill names
    all_skills = set()
    for category in ['programming', 'software', 'technical']:
        if category in cv_skills and isinstance(cv_skills[category], list):
            for skill in cv_skills[category]:
                if isinstance(skill, dict) and 'name' in skill:
                    all_skills.add(skill['name'])
    
    if 'uncategorized' in cv_skills and isinstance(cv_skills['uncategorized'], list):
        for skill in cv_skills['uncategorized']:
            if isinstance(skill, dict) and 'name' in skill:
                all_skills.add(skill['name'])
    
    cv_skills['allSkillsCache'] = sorted(list(all_skills))
    
    return cv_skills, duplicate_count


class TestSkillLinking:
    """Test suite for skill linking functionality."""
    
    def test_derive_skills(self):
        """Test deriving skills from projects."""
        # Mock projects data
        projects = [
            {
                "id": "uav-deterrence",
                "skills": ["Python", "C++", "ROS"]
            },
            {
                "id": "mine-sampling",
                "skills": ["Python", "MATLAB", "Machine Learning"]
            }
        ]
        
        result = derive_skills_from_projects(projects)
        
        # Assertions
        assert "Python" in result
        assert result["Python"] == ["uav-deterrence", "mine-sampling"]
        assert result["C++"] == ["uav-deterrence"]
        assert result["MATLAB"] == ["mine-sampling"]
        assert result["Machine Learning"] == ["mine-sampling"]
        assert result["ROS"] == ["uav-deterrence"]
    
    def test_derive_skills_string_format(self):
        """Test deriving skills from comma-separated string format."""
        projects = [
            {
                "id": "test-project",
                "skills": "Python, JavaScript, React"
            }
        ]
        
        result = derive_skills_from_projects(projects)
        
        assert result["Python"] == ["test-project"]
        assert result["JavaScript"] == ["test-project"]
        assert result["React"] == ["test-project"]
    
    def test_derive_skills_no_skills(self):
        """Test handling projects without skills field."""
        projects = [
            {
                "id": "no-skills-project",
                "title": "Test Project"
            }
        ]
        
        result = derive_skills_from_projects(projects)
        assert len(result) == 0
    
    def test_derive_skills_invalid_input(self):
        """Test handling invalid input."""
        result = derive_skills_from_projects(None)
        assert result == {}
        
        result = derive_skills_from_projects("not a list")
        assert result == {}
    
    def test_update_cache(self):
        """Test updating CV skills cache."""
        # Mock CV skills
        cv_skills = {
            "programming": ["Python", "C++"],
            "software": ["Git", "ROS"],
            "technical": ["Machine Learning"]
        }
        
        # Mock projects
        projects = [
            {
                "id": "uav-deterrence",
                "skills": ["Python", "C++", "ROS", "New Skill"]
            },
            {
                "id": "mine-sampling", 
                "skills": ["Python", "Machine Learning", "MATLAB"]
            }
        ]
        
        updated_skills, duplicate_count = update_cv_skills_cache(cv_skills, projects)
        
        # Check structure
        assert "uncategorized" in updated_skills
        assert "allSkillsCache" in updated_skills
        
        # Check manual skills were updated with projects
        python_skill = next(s for s in updated_skills["programming"] if s["name"] == "Python")
        assert set(python_skill["projects"]) == {"uav-deterrence", "mine-sampling"}
        
        # Check new skills added to uncategorized
        uncategorized_names = [s["name"] for s in updated_skills["uncategorized"]]
        assert "New Skill" in uncategorized_names
        assert "MATLAB" in uncategorized_names
        
        # Check all skills cache is sorted
        assert updated_skills["allSkillsCache"] == sorted(updated_skills["allSkillsCache"])
        
        # Check no duplicates
        all_skills = []
        for category in ["programming", "software", "technical", "uncategorized"]:
            if category in updated_skills:
                all_skills.extend([s["name"] for s in updated_skills[category] if isinstance(s, dict)])
        
        assert len(all_skills) == len(set(all_skills))
    
    def test_update_cache_no_duplicates(self):
        """Test that duplicates are avoided in cache update."""
        cv_skills = {
            "programming": ["Python"],
            "uncategorized": [{"name": "Test Skill", "projects": []}]
        }
        
        projects = [
            {
                "id": "test-project",
                "skills": ["Python", "Test Skill"]
            }
        ]
        
        updated_skills, duplicate_count = update_cv_skills_cache(cv_skills, projects)
        
        # Python should be updated but not duplicated
        python_skill = next(s for s in updated_skills["programming"] if s["name"] == "Python")
        assert python_skill["projects"] == ["test-project"]
        
        # Test Skill should be updated in uncategorized, not duplicated
        test_skill = next(s for s in updated_skills["uncategorized"] if s["name"] == "Test Skill")
        assert test_skill["projects"] == ["test-project"]
        
        # Check duplicate count
        assert duplicate_count == 2  # Both skills were already present


if __name__ == "__main__":
    pytest.main([__file__, "-v"])