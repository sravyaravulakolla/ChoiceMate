import pandas as pd

df = pd.read_pickle(r"C:\Users\Vaishnavi\4-2\MajorProject\ChoiceMate\choicemate-flask-api\data\combined_products.pkl")

df['id'] = df.index + 1
df.to_json("combined_products.json", orient="records")
