import duckdb
import os
import numpy as np
import xarray as xr
from openpyxl import load_workbook
import re
import sys

# Set UTF-8 encoding for stdout/stderr to handle special characters
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'replace')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'replace')

def valid_name(file_name):
    """Generate a valid name for variables and tables"""
    table_name = re.sub(r'\W+', '_', file_name)

    if table_name and table_name[0].isdigit():
        table_name = f"t_{table_name}"

    return table_name

def from_csv(file_path, project_path):
    """Load any CSV file into DuckDB directly."""
    file_name = os.path.splitext(os.path.basename(file_path))[0]
    table_name = valid_name(file_name)
    os.makedirs(f"{project_path}/data", exist_ok=True)

    # ReadCSV and save to DuckDB
    con = duckdb.connect(f"{project_path}//data//project_data.db")
    con.execute(f"""
            CREATE TABLE IF NOT EXISTS {table_name} AS
            SELECT * 
            FROM read_csv(
                '{file_path}',
                header = true
            )
    """)

    con.close()

def from_excel(file_path, project_path):
    """
    Load any Excel file (.xlsx, .xls, .xlsm) into DuckDB directly.
    Automatically creates one table per sheet, named like filename_sheetname.
    """

    file_name = os.path.splitext(os.path.basename(file_path))[0]
    os.makedirs(f"{project_path}/data", exist_ok=True)

    con = duckdb.connect(f"{project_path}//data//project_data.db")

    con.execute("INSTALL excel;")
    con.execute("LOAD excel;")

    # Get all sheet names
    wb = load_workbook(filename=file_path, read_only=True)
    sheet_names = wb.sheetnames
    wb.close()
    
    # Create a DuckDB table per sheet
    if len(sheet_names) == 1:
        sheet = sheet_names[0]
        table_name = valid_name(file_name)
        print(f"Creating table {table_name} from sheet '{sheet}'")
        con.execute(f"""
            CREATE TABLE IF NOT EXISTS "{table_name}" AS
            SELECT * FROM read_xlsx('{file_path}', sheet='{sheet}', header=true)
        """)
    else:
        # Multiple sheets: table per sheet named file_sheetname
        file_name = valid_name(file_name)
        for sheet in sheet_names:
            safe_sheet = valid_name(sheet)
            table_name = f"{file_name}_{safe_sheet}"
            print(f"Creating table {table_name} from sheet '{sheet}'")
            con.execute(f"""
                CREATE TABLE IF NOT EXISTS "{table_name}" AS
                SELECT * FROM read_xlsx('{file_path}', sheet='{sheet}', header=true)
            """)

    con.close()
    print(f"SUCCESS: All sheets loaded from {file_name} into {project_path}")

def from_netcdf(file_path, project_path):
    """
    Load any NetCDF file (geospatial or non-geospatial) into DuckDB as a flat table.
    """

    os.makedirs(f"{project_path}/data", exist_ok=True)
    con = duckdb.connect(f"{project_path}//data//project_data.db")

    file_name = os.path.splitext(os.path.basename(file_path))[0]
    table_name = valid_name(file_name)
    print(f"Loading NetCDF: {file_name}")

    # Load dataset
    ds = xr.open_dataset(file_path)

    # Detect spatial and temporal dimensions
    dims = list(ds.dims.keys())
    vars_ = list(ds.data_vars.keys())

    print(f"Dimensions detected: {dims}")
    print(f"Variables: {vars_[:10]}{'...' if len(vars_) > 10 else ''}")

    try:
        # Convert to dataframe and flatten multi-dim coordinates
        df = ds.to_dataframe().reset_index()
    except ValueError:
        # Handle irregular grid NetCDF
        df = xr.Dataset.to_dataframe(ds, dim_order=None).reset_index()

    # Handle geospatial coordinates if present
    # Normalize lat/lon naming consistency
    possible_lat_names = ["lat", "latitude", "Latitude", "LAT"]
    possible_lon_names = ["lon", "longitude", "Longitude", "LON"]

    for lat_name in possible_lat_names:
        if lat_name in df.columns:
            df.rename(columns={lat_name: "latitude"}, inplace=True)
            break
    for lon_name in possible_lon_names:
        if lon_name in df.columns:
            df.rename(columns={lon_name: "longitude"}, inplace=True)
            break

    # Replace NaNs with None for DuckDB compatibility
    df = df.replace({np.nan: None})

    # Register and save to DuckDB
    con.register("tmp_netcdf", df)
    con.execute(f"CREATE TABLE IF NOT EXISTS {table_name} AS SELECT * FROM tmp_netcdf")
    con.unregister("tmp_netcdf")
    con.close()
    
    print(f"SUCCESS: NetCDF file loaded as table {table_name}")

if __name__ == "__main__":
    """Expect: project_path as first arg, file_path as second arg"""
    args = sys.argv[1:]
    if len(args) < 2:
        print("ERROR: Usage: python data_load.py <project_path> <file_path>")
        sys.exit(1)

    project_path, file_path = args[0], args[1]

    # Basic validation
    if not os.path.isfile(file_path):
        print(f"ERROR: File not found: {file_path}")
        sys.exit(1)

    # Determine which loader to use based on file extension
    ext = os.path.splitext(file_path)[1].lower().lstrip('.')

    try:
        if ext == 'csv':
            from_csv(file_path, project_path)
            print(f"SUCCESS: Loaded CSV into project at {project_path}")
        elif ext in ('xlsx', 'xls', 'xlsm'):
            from_excel(file_path, project_path)
            print(f"SUCCESS: Loaded Excel into project at {project_path}")
        elif ext in ('nc', 'netcdf'):
            from_netcdf(file_path, project_path)
            print(f"SUCCESS: Loaded NetCDF into project at {project_path}")
        else:
            print(
                f"ERROR: Unsupported file extension '.{ext}'. Supported: .csv, .xlsx/.xls/.xlsm, .nc/.netcdf"
            )
            sys.exit(2)
    except Exception as e:
        print(f"ERROR: Failed to load file: {str(e)}")
        sys.exit(3)
