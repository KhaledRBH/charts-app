from django.shortcuts import redirect, render
from django.db import connection
from django.http import HttpResponse
from .models import query
from django.http import JsonResponse
from django.db import connection
from django.contrib.auth.decorators import login_required



@login_required
def add_query(request):
    if request.method == "POST":
        name = request.POST.get("query_name")
        sql = request.POST.get("query_text")

        if name and sql:
            query.objects.create(
                query_name=name,
                query_text=sql
            )
            return redirect("execute_query")

    return render(request, "app/add_query.html")

@login_required
def execute_query(request):
    try:
        queries = query.objects.all()  # <-- Make sure your model is Query
        selected_id = request.GET.get("query_id")
        condition = request.GET.get("condition", "").strip()

        rows, columns, error = [], [], None
        page_size = 200

        if selected_id:
            q = query.objects.filter(id=selected_id).first()
            if q:
                try:
                    sql = q.query_text.strip().rstrip(";")
                    params = []

                    if condition:
                        conditions = [c.strip() for c in condition.split() if c.strip()]
                        if conditions:
                            placeholders = ', '.join(['%s'] * len(conditions))
                            if "where" in sql.lower():
                                sql += f' AND LEFT(a."name", 3) IN ({placeholders})'
                            else:
                                sql += f' WHERE LEFT(a."name", 3) IN ({placeholders})'
                            params.extend(conditions)

                    sql += f" LIMIT {page_size} OFFSET 0"

                    with connection.cursor() as cursor:
                        if params:
                            cursor.execute(sql, params)
                        else:
                            cursor.execute(sql)
                        columns = [col[0] for col in cursor.description]
                        rows = cursor.fetchall()

                except Exception as e:
                    error = str(e)

        return render(request, "app/execute_query.html", {
            "queries": queries,
            "selected_id": selected_id,
            "columns": columns,
            "rows": rows,
            "condition": condition,
            "error": error,
        })

    except Exception as e:
        import traceback
        print(traceback.format_exc())  # <-- prints full error in console
        return HttpResponse(f"Error: {str(e)}", status=500)


@login_required
def load_more_query_rows(request):
    query_id = request.GET.get("query_id")
    condition = request.GET.get("condition", "").strip()
    offset = int(request.GET.get("offset", 0))
    limit = int(request.GET.get("limit", 200))

    if not query_id:
        return JsonResponse({"rows": []})

    q = query.objects.filter(id=query_id).first()
    if not q:
        return JsonResponse({"rows": []})

    try:
        sql = q.query_text.strip().rstrip(";")
        params = []

        # Apply the same condition logic as in execute_query
        if condition:
            # Split by space to get multiple conditions
            conditions = [c.strip() for c in condition.split() if c.strip()]
            
            if conditions:
                # Build IN clause for multiple conditions
                placeholders = ', '.join(['%s'] * len(conditions))
                
                if "where" in sql.lower():
                    sql += f' AND LEFT(a."name", 3) IN ({placeholders})'
                else:
                    sql += f' WHERE LEFT(a."name", 3) IN ({placeholders})'
                
                params.extend(conditions)

        sql += f" LIMIT {limit} OFFSET {offset}"

        with connection.cursor() as cursor:
            if params:
                cursor.execute(sql, params)
            else:
                cursor.execute(sql)
            
            rows = cursor.fetchall()

        return JsonResponse({"rows": rows})

    except Exception as e:
        return JsonResponse({"error": str(e)}, status=500)


@login_required
def load_filter_values(request):
    query_id = request.GET.get("query_id")
    if not query_id:
        return JsonResponse({"filters": []})

    q = query.objects.filter(id=query_id).first()
    if not q:
        return JsonResponse({"filters": []})

    filters = []
    try:
        sql = q.query_text.strip().rstrip(";")

        # Example: get DISTINCT LEFT(a."name", 3) values
        # You might need to change 'a."name"' to the actual column you want
        distinct_sql = f'SELECT DISTINCT {"name"} FROM ({sql}) AS subquery'

        with connection.cursor() as cursor:
            cursor.execute(distinct_sql)
            filters = sorted([row[0] for row in cursor.fetchall() if row[0]])
    except Exception as e:
        print("Error loading filters:", e)

    return JsonResponse({"filters": filters})




