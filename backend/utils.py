from bs4 import BeautifulSoup
from .models import CrawlResult, CourseRecord
import re
from typing import List

def parse_course_list(html_content: str) -> List[CourseRecord]:
    soup = BeautifulSoup(html_content, 'html.parser')
    courses = []
    
    # Locate the table inside .course-content
    container = soup.find('div', class_='course-content')
    if not container:
        print("DEBUG: .course-content not found")
        return []
        
    rows = container.find_all('tr', class_='cur-td')
    print(f"DEBUG: Found {len(rows)} course rows")
    
    for row in rows:
        try:
            cols = row.find_all('td')
            if len(cols) < 9:
                continue
                
            # Col 1: Date (2 spans usually)
            date_div = cols[0].find('div', class_='td-box')
            date_str = " ".join([s.text.strip() for s in date_div.find_all('span')]) if date_div else cols[0].text.strip()
            
            # Col 2: Name
            name_div = cols[1].find('div', class_='td-box')
            name_str = name_div.text.strip() if name_div else cols[1].text.strip()
            
            # Col 3: Mode
            mode_div = cols[2].find('div', class_='td-box')
            mode_str = mode_div.text.strip() if mode_div else cols[2].text.strip()
            
            # Col 4: Unit
            unit_div = cols[3].find('div', class_='td-box')
            unit_str = unit_div.text.strip() if unit_div else cols[3].text.strip()
            
            # Col 5: Attribute
            attr_div = cols[4].find('div', class_='td-box')
            attr_str = attr_div.text.strip() if attr_div else cols[4].text.strip()
            
            # Col 6: Category
            cat_div = cols[5].find('div', class_='td-box')
            cat_str = cat_div.text.strip() if cat_div else cols[5].text.strip()
            
            # Col 7: Training Course
            train_div = cols[6].find('div', class_='td-box')
            train_str = train_div.text.strip() if train_div else cols[6].text.strip()
            
            # Col 8: Points
            points_div = cols[7].find('div', class_='td-box')
            points_text = points_div.text.strip() if points_div else cols[7].text.strip()
            try:
                points_val = float(points_text)
            except:
                points_val = 0.0
                
            # Col 9: Status
            status_div = cols[8].find('div', class_='td-box')
            status_str = status_div.text.strip() if status_div else cols[8].text.strip()
            
            record = CourseRecord(
                date=date_str,
                name=name_str,
                mode=mode_str,
                unit=unit_str,
                attribute=attr_str,
                category=cat_str,
                training_course=train_str,
                points=points_val,
                status=status_str
            )
            courses.append(record)
            
        except Exception as e:
            print(f"DEBUG: Error parsing row: {e}")
            continue
            
    return courses

def parse_ltc_html(html_content: str, idno: str, dob: str) -> CrawlResult:
    soup = BeautifulSoup(html_content, 'html.parser')
    
    print(f"DEBUG: Parsing HTML length: {len(html_content)}")
    
    # Helper to extract float from element by ID
    def get_points_by_id(element_id):
        try:
            # Structure: <span id="..."><button>VALUE</button></span>
            span = soup.find(id=element_id)
            if span:
                # Value matches inside button or text
                btn = span.find('button')
                text = btn.text.strip() if btn else span.text.strip()
                print(f"DEBUG: Found ID {element_id} -> '{text}'")
                if not text:
                    return 0.0
                return float(text)
            print(f"DEBUG: ID {element_id} NOT FOUND")
            return 0.0
        except Exception as e:
            print(f"DEBUG: Error parsing ID {element_id}: {e}")
            return 0.0

    # 1. Professional Course (專業課程)
    prof_physical = get_points_by_id("cp05L9I1E")
    prof_online = get_points_by_id("cp05L9I1N")
    
    # 2. Professional Quality (專業品質)
    qual_physical = get_points_by_id("cp10L9I1E")
    qual_online = get_points_by_id("cp10L9I1N")
    
    # 3. Professional Ethics (專業倫理)
    ethic_physical = get_points_by_id("cp15L9I1E")
    ethic_online = get_points_by_id("cp15L9I1N")
    
    # 4. Professional Laws (專業法規)
    law_physical = get_points_by_id("cp20L9I1E")
    law_online = get_points_by_id("cp20L9I1N")
    
    # Sum up specialized points for the model
    professional_points = prof_physical + prof_online
    quality_points = qual_physical + qual_online
    ethics_points = ethic_physical + ethic_online
    laws_points = law_physical + law_online
    
    # 5. Special Categories
    fire_safety = get_points_by_id("ct05L9I2Total")
    emergency = get_points_by_id("ct10L9I2Total")
    infection = get_points_by_id("ct15L9I2Total")
    gender = get_points_by_id("ct20L9I2Total")
    
    # Indigenous categories (Original + New specific ones)
    indigenous_legacy = get_points_by_id("ct30L9I2Total") 
    indigenous_culture = get_points_by_id("ct35L9I2Total") 
    diverse_culture = get_points_by_id("ct40L9I2Total")
    
    # Sum all indigenous/culture points into one field
    total_indigenous = indigenous_legacy + indigenous_culture + diverse_culture

    # Total Points
    # Use explicit totals from the screenshot IDs if available to ensure match with UI
    total_physical = get_points_by_id("cpL11I3E")
    
    # Online total is split in UI: Before 2023/10/12 and After
    total_online_old = get_points_by_id("cpL11I3NB20231012")
    total_online_new = get_points_by_id("cpL11I3NA20231013")
    
    calculated_total = total_physical + total_online_old + total_online_new
    
    # Fallback if explicit totals are 0 but individual points aren't (unlikely but safe)
    sum_individual = (professional_points + quality_points + ethics_points + laws_points +
                      fire_safety + emergency + infection + gender + total_indigenous)
    
    # Use calculated_total if it seems valid (non-zero), else fall back or keep 0
    total_points = calculated_total if calculated_total > 0 else sum_individual

    # Valid Period Parsing
    # The valid period is usually in the header text, e.g.:
    # "課程區間(根據人員證書有效期間)： 111/05/01-117/04/30"
    valid_period = ""
    try:
        text_content = soup.get_text()
        # Look for the pattern YYY/MM/DD-YYY/MM/DD
        # We can be more specific: look for line containing "有效期間"
        date_pattern = re.compile(r"(\d{3}/\d{2}/\d{2})\s*-\s*(\d{3}/\d{2}/\d{2})")
        
        # Simple search in the whole text might catch other dates, but usually the range is distinct
        # Let's try to find the specific container if possible, otherwise first match might be okay
        # or match near "課程區間"
        
        match = date_pattern.search(text_content)
        if match:
            valid_period = f"{match.group(1)}-{match.group(2)}"
            
        # If not found, try to look specifically in div.course-start if it exists
        if not valid_period:
            div = soup.find('div', class_='course-start')
            if div:
                match = date_pattern.search(div.get_text())
                if match:
                    valid_period = f"{match.group(1)}-{match.group(2)}"

    except Exception:
        pass

    # Construct raw_data with all granular values for frontend table rendering
    raw_data = {
        # Table 1: Professional
        "prof_physical": prof_physical,
        "prof_online": prof_online,
        "qual_physical": qual_physical,
        "qual_online": qual_online,
        "ethic_physical": ethic_physical,
        "ethic_online": ethic_online,
        "law_physical": law_physical,
        "law_online": law_online,
        
        # Table 2: Special
        "fire_safety": fire_safety,
        "emergency": emergency,
        "infection": infection,
        "gender": gender,
        
        # Table 3: Cultural
        "indigenous_legacy": indigenous_legacy,
        "indigenous_culture": indigenous_culture,
        "diverse_culture": diverse_culture,
        
        # Table 4: Totals
        "total_physical": total_physical,
        "total_online_old": total_online_old,
        "total_online_new": total_online_new,
    }

    return CrawlResult(
        idno=idno,
        dob=dob,
        name="", 
        valid_period=valid_period,
        professional_points=round(professional_points, 2),
        quality_points=round(quality_points, 2),
        ethics_points=round(ethics_points, 2),
        laws_points=round(laws_points, 2),
        fire_safety_points=round(fire_safety, 2),
        emergency_points=round(emergency, 2),
        infection_points=round(infection, 2),
        gender_points=round(gender, 2),
        indigenous_points=round(total_indigenous, 2),
        total_points=round(total_points, 2),
        raw_data=raw_data,
        status="success" if valid_period else "success_no_period"
    )
