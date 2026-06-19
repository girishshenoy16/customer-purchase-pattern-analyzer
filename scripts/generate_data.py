import os
import random
import csv
from datetime import datetime, timedelta

def generate_mock_dataset(num_records=105000, output_path="data/raw/customer_purchase_data.csv"):
    # Ensure directory exists
    os.makedirs(os.path.dirname(output_path), exist_ok=True)

    print(f"Generating {num_records} customer purchase records...")

    # Static customer properties pool
    cities_regions = [
        ("New York", "East"), ("Boston", "East"), ("Philadelphia", "East"),
        ("Los Angeles", "West"), ("San Francisco", "West"), ("Seattle", "West"),
        ("Chicago", "North"), ("Detroit", "North"), ("Minneapolis", "North"),
        ("Houston", "South"), ("Atlanta", "South"), ("Miami", "South")
    ]
    
    occupations = ["Engineer", "Teacher", "Doctor", "Artist", "Student", "Retired", "Manager", "Salesperson", "Writer", None]
    genders = ["Male", "Female"]
    loyalty_statuses = ["Bronze", "Silver", "Gold", "Platinum"]
    payment_methods = ["Credit Card", "Debit Card", "PayPal", "Cash", "Bank Transfer"]
    purchase_channels = ["Online", "In-Store", "Mobile App"]
    
    categories_products = {
        "Electronics": [
            ("Smartphone", 800), ("Wireless Headphones", 150), ("Smart Watch", 250), 
            ("Laptop", 1200), ("Bluetooth Speaker", 80), ("Tablet", 450)
        ],
        "Apparel": [
            ("Denim Jacket", 90), ("Running Shoes", 120), ("T-Shirt", 25), 
            ("Hoodie", 55), ("Socks Pack", 15), ("Sunglasses", 80)
        ],
        "Home & Kitchen": [
            ("Coffee Maker", 100), ("Air Fryer", 130), ("Blender", 70), 
            ("Vacuum Cleaner", 200), ("Chef Knife Set", 150), ("Dinnerware Set", 85)
        ],
        "Beauty & Personal Care": [
            ("Skincare Serum", 45), ("Hair Dryer", 60), ("Perfume", 95), 
            ("Electric Toothbrush", 80), ("Face Mask Pack", 20), ("Shampoo Bottle", 15)
        ],
        "Sports & Outdoors": [
            ("Yoga Mat", 30), ("Water Bottle", 20), ("Dumbbells Set", 50), 
            ("Camping Tent", 180), ("Backpack", 75), ("Resistance Bands", 15)
        ]
    }

    # Generate static customer database first (e.g., 8000 customers)
    num_customers = 8000
    customers = []
    
    # Generate names helper
    first_names_m = ["James", "John", "Robert", "Michael", "William", "David", "Richard", "Joseph", "Thomas", "Charles"]
    first_names_f = ["Mary", "Patricia", "Jennifer", "Linda", "Elizabeth", "Barbara", "Susan", "Jessica", "Sarah", "Karen"]
    last_names = ["Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller", "Davis", "Rodriguez", "Martinez"]

    for i in range(1, num_customers + 1):
        cust_id = f"CUST-{i:05d}"
        gender = random.choice(genders)
        if gender == "Male":
            first_name = random.choice(first_names_m)
        elif gender == "Female":
            first_name = random.choice(first_names_f)
        else:
            first_name = random.choice(first_names_m + first_names_f)
            
        last_name = random.choice(last_names)
        
        # Introduce casing noise in names to allow cleaning demonstrations
        casing_style = random.choice(["proper", "upper", "lower", "messy"])
        if casing_style == "upper":
            cust_name = f"{first_name} {last_name}".upper()
        elif casing_style == "lower":
            cust_name = f"{first_name} {last_name}".lower()
        elif casing_style == "messy":
            # e.g., jOhN SMitH
            full_name = f"{first_name} {last_name}"
            cust_name = "".join(c.upper() if random.random() > 0.5 else c.lower() for c in full_name)
        else:
            cust_name = f"{first_name} {last_name}"
            
        age = random.randint(18, 75)
        city, region = random.choice(cities_regions)
        
        # Introduce messy city casings
        if random.random() < 0.05:
            city = city.lower()
        elif random.random() < 0.02:
            city = city.upper()
            
        occupation = random.choice(occupations)
        loyalty = random.choice(loyalty_statuses)
        
        # Base purchase frequency of customer (determines purchase likelihood)
        loyalty_freq_weights = {"Bronze": 3, "Silver": 6, "Gold": 12, "Platinum": 20}
        base_freq = random.randint(1, loyalty_freq_weights[loyalty])
        
        customers.append({
            "Customer ID": cust_id,
            "Customer Name": cust_name,
            "Age": age,
            "Gender": gender,
            "City": city,
            "Region": region,
            "Occupation": occupation,
            "Loyalty Status": loyalty,
            "Base Frequency": base_freq,
            "Purchase Dates": []
        })

    # Prepare transactions list
    transactions = []
    
    # Start and End Date
    start_date = datetime(2025, 1, 1)
    end_date = datetime(2025, 12, 31)
    delta_days = (end_date - start_date).days

    # Customer weights based on loyalty status
    customer_weights = []
    for c in customers:
        if c["Loyalty Status"] == "Platinum":
            customer_weights.append(10)
        elif c["Loyalty Status"] == "Gold":
            customer_weights.append(5)
        elif c["Loyalty Status"] == "Silver":
            customer_weights.append(3)
        else:
            customer_weights.append(1)

    print("Generating transactions...")
    for idx in range(num_records):
        # Pick customer based on weights (loyalty customers purchase more)
        customer = random.choices(customers, weights=customer_weights, k=1)[0]
        
        # Pick category and product
        category = random.choice(list(categories_products.keys()))
        product, base_price = random.choice(categories_products[category])
        
        # Introduce pricing noise
        unit_price = round(base_price * random.uniform(0.95, 1.05), 2)
        quantity = random.randint(1, 5)
        
        # Discount logic: Gold/Platinum get more discounts
        discount_odds = {"Bronze": 0.1, "Silver": 0.2, "Gold": 0.4, "Platinum": 0.6}
        discount = 0.0
        if random.random() < discount_odds[customer["Loyalty Status"]]:
            discount = random.choice([0.05, 0.1, 0.15, 0.2])
            
        total_value = round((unit_price * quantity) * (1 - discount), 2)
        
        # Date generation with inconsistent formats to demonstrate cleaning
        random_days = random.randint(0, delta_days)
        purchase_date = start_date + timedelta(days=random_days)
        customer["Purchase Dates"].append(purchase_date)
        
        date_format_choice = random.choices(
            ["YYYY-MM-DD", "MM/DD/YYYY", "DD-MM-YYYY"], 
            weights=[0.85, 0.10, 0.05], 
            k=1
        )[0]
        
        if date_format_choice == "MM/DD/YYYY":
            date_str = purchase_date.strftime("%m/%d/%Y")
        elif date_format_choice == "DD-MM-YYYY":
            date_str = purchase_date.strftime("%d-%m-%Y")
        else:
            date_str = purchase_date.strftime("%Y-%m-%d")

        # Payment and channel
        payment = random.choice(payment_methods)
        channel = random.choice(purchase_channels)
        
        # Basic Segment initialization (with occasional discrepancies to clean)
        segment = "Standard"
        if customer["Loyalty Status"] in ["Gold", "Platinum"] and total_value > 200:
            segment = "High-Value"
        elif customer["Age"] < 25 and channel == "Mobile App":
            segment = "Gen-Z Digital"
            
        # Add some noise to segment to clean in scripts
        if random.random() < 0.02:
            segment = segment.upper()

        transactions.append({
            "Customer ID": customer["Customer ID"],
            "Customer Name": customer["Customer Name"],
            "Age": customer["Age"],
            "Gender": customer["Gender"],
            "City": customer["City"],
            "Region": customer["Region"],
            "Occupation": customer["Occupation"],
            "Product Category": category,
            "Product Name": product,
            "Purchase Date": date_str,
            "Quantity Purchased": quantity,
            "Unit Price": unit_price,
            "Total Purchase Value": total_value,
            "Payment Method": payment,
            "Purchase Channel": channel,
            "Customer Segment": segment,
            "Loyalty Status": customer["Loyalty Status"],
            "Discount Used": discount
        })

    # Now calculate and add customer-level columns (Purchase Frequency and Last Purchase Date)
    print("Populating customer-level tracking metrics...")
    for c in customers:
        if c["Purchase Dates"]:
            c["Actual Frequency"] = len(c["Purchase Dates"])
            c["Last Purchase Date"] = max(c["Purchase Dates"]).strftime("%Y-%m-%d")
        else:
            c["Actual Frequency"] = 0
            c["Last Purchase Date"] = None

    # Merge customer-level data back to transactions
    cust_lookup = {c["Customer ID"]: (c["Actual Frequency"], c["Last Purchase Date"]) for c in customers}
    
    # Introduce duplicate rows (around 1%) to demonstrate duplicate removal
    num_duplicates = int(num_records * 0.01)
    duplicate_indices = random.sample(range(num_records), num_duplicates)
    
    # Writing to CSV
    fields = [
        "Customer ID", "Customer Name", "Age", "Gender", "City", "Region", "Occupation",
        "Product Category", "Product Name", "Purchase Date", "Quantity Purchased", "Unit Price",
        "Total Purchase Value", "Payment Method", "Purchase Channel", "Customer Segment",
        "Loyalty Status", "Discount Used", "Purchase Frequency", "Last Purchase Date"
    ]
    
    with open(output_path, mode="w", newline="", encoding="utf-8") as file:
        writer = csv.DictWriter(file, fieldnames=fields)
        writer.writeheader()
        
        for idx, t in enumerate(transactions):
            freq, last_date = cust_lookup[t["Customer ID"]]
            
            # Map values to matching headers
            row = {
                "Customer ID": t["Customer ID"],
                "Customer Name": t["Customer Name"],
                "Age": t["Age"],
                "Gender": t["Gender"],
                "City": t["City"],
                "Region": t["Region"],
                "Occupation": t["Occupation"],
                "Product Category": t["Product Category"],
                "Product Name": t["Product Name"],
                "Purchase Date": t["Purchase Date"],
                "Quantity Purchased": t["Quantity Purchased"],
                "Unit Price": t["Unit Price"],
                "Total Purchase Value": t["Total Purchase Value"],
                "Payment Method": t["Payment Method"],
                "Purchase Channel": t["Purchase Channel"],
                "Customer Segment": t["Customer Segment"],
                "Loyalty Status": t["Loyalty Status"],
                "Discount Used": t["Discount Used"],
                "Purchase Frequency": freq,
                "Last Purchase Date": last_date
            }
            
            writer.writerow(row)
            
            # Write a duplicate row if this index was chosen
            if idx in duplicate_indices:
                writer.writerow(row)

    print(f"Dataset generated successfully at {output_path}. Total rows written: {num_records + num_duplicates}")

if __name__ == "__main__":
    generate_mock_dataset()
