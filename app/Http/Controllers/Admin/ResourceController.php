<?php

namespace App\Http\Controllers\Admin;

use App\Admin\AdminResources;
use App\Http\Controllers\Controller;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

/** CRUD générique du back-office, piloté par AdminResources. */
class ResourceController extends Controller
{
    public function index(Request $request, string $resource)
    {
        $def = AdminResources::get($resource);
        $fields = AdminResources::fields($resource);
        $columns = AdminResources::columns($resource);
        $query = AdminResources::model($resource)->newQuery();

        // Filtres par élément parent : ?trip_id=12 liste le contenu d'un voyage.
        $filters = [];
        foreach ($fields as $field) {
            if ($field['type'] === 'relation' && $request->filled($field['name'])) {
                $query->where($field['name'], $request->integer($field['name']));
                $parent = AdminResources::model($field['resource'])->newQuery()->find($request->integer($field['name']));
                $filters[] = [
                    'field' => $field['name'],
                    'label' => $field['label'],
                    'value' => $request->integer($field['name']),
                    'title' => AdminResources::title($field['resource'], $parent),
                    'resource' => $field['resource'],
                ];
            }
        }

        if ($search = trim((string) $request->query('q'))) {
            $query->where(function ($where) use ($search, $def) {
                if (ctype_digit($search)) {
                    $where->orWhere($where->getModel()->getKeyName(), (int) $search);
                }
                foreach ($def['search'] as $column) {
                    $where->orWhere($column, 'like', '%' . $search . '%');
                }
            });
        }

        $sort = in_array($request->query('sort'), ['id', ...array_keys($fields)], true) ? $request->query('sort') : 'id';
        $direction = $request->query('dir') === 'asc' ? 'asc' : 'desc';
        $page = $query->orderBy($sort, $direction)->paginate(25)->withQueryString();
        $titles = AdminResources::relationTitles($resource, $page->items(), $columns);

        return Inertia::render('Admin/Resource/Index', [
            'resource' => $this->meta($def),
            'columns' => array_map(fn ($field) => collect($field)->except(['directory', 'unique'])->all(), $columns),
            'filters' => $filters,
            'query' => ['q' => $search, 'sort' => $sort, 'dir' => $direction],
            'rows' => collect($page->items())->map(fn (Model $model) => [
                'id' => $model->getKey(),
                'title' => AdminResources::title($resource, $model),
                'values' => collect($columns)->mapWithKeys(fn ($field) => [$field['name'] => AdminResources::displayValue($field, $model, $titles)])->all(),
                'badges' => isset($def['badges']) ? $def['badges']($model) : [],
            ]),
            'pagination' => [
                'total' => $page->total(),
                'from' => $page->firstItem(),
                'to' => $page->lastItem(),
                'prev' => $page->previousPageUrl(),
                'next' => $page->nextPageUrl(),
                'current' => $page->currentPage(),
                'last' => $page->lastPage(),
            ],
        ]);
    }

    public function create(Request $request, string $resource)
    {
        $model = AdminResources::model($resource);
        // Pré-remplit le parent quand on ajoute depuis une liste filtrée (ex. une étape d'un voyage).
        foreach (AdminResources::fields($resource) as $field) {
            if ($field['type'] === 'relation' && $request->filled($field['name'])) {
                $model->setAttribute($field['name'], $request->integer($field['name']));
            }
        }

        return $this->form($resource, $model);
    }

    public function store(Request $request, string $resource)
    {
        $model = AdminResources::model($resource);
        $this->save($request, $resource, $model);

        return redirect()->route('admin.resources.edit', [$resource, $model->getKey()])
            ->with('status', AdminResources::get($resource)['singular'] . ' créé(e).');
    }

    public function edit(string $resource, string $id)
    {
        return $this->form($resource, $this->find($resource, $id));
    }

    public function update(Request $request, string $resource, string $id)
    {
        $this->save($request, $resource, $this->find($resource, $id));

        return back()->with('status', 'Modifications enregistrées.');
    }

    public function destroy(string $resource, string $id)
    {
        $def = AdminResources::get($resource);
        $model = $this->find($resource, $id);

        try {
            $model->delete();
        } catch (QueryException $exception) {
            report($exception);

            return back()->with('error', 'Suppression impossible : d’autres éléments dépendent de celui-ci (commandes, réservations…). Supprimez-les d’abord.');
        }
        if (isset($def['deleting'])) {
            $def['deleting']($model);
        }

        return redirect()->route('admin.resources.index', $resource)->with('status', $def['singular'] . ' supprimé(e).');
    }

    /** Interrupteur en ligne d'un booléen autorisé (ex. Premium offert). */
    public function toggle(Request $request, string $resource, string $id)
    {
        $def = AdminResources::get($resource);
        $field = $request->validate(['field' => ['required', Rule::in($def['toggles'] ?? [])]])['field'];
        $model = $this->find($resource, $id);
        $model->forceFill([$field => !$model->getAttribute($field)])->save();

        return back()->with('status', 'Mise à jour enregistrée.');
    }

    /** Recherche pour les sélecteurs de relation. */
    public function lookup(Request $request, string $resource)
    {
        $def = AdminResources::get($resource);
        $query = AdminResources::model($resource)->newQuery();
        $search = trim((string) $request->query('q'));

        if ($search !== '') {
            $query->where(function ($where) use ($search, $def) {
                if (ctype_digit($search)) {
                    $where->orWhere($where->getModel()->getKeyName(), (int) $search);
                }
                foreach ($def['search'] as $column) {
                    $where->orWhere($column, 'like', '%' . $search . '%');
                }
            });
        }

        return response()->json([
            'options' => $query->latest($query->getModel()->getKeyName())->limit(20)->get()
                ->map(fn (Model $model) => ['id' => $model->getKey(), 'label' => '#' . $model->getKey() . ' · ' . AdminResources::title($resource, $model)]),
        ]);
    }

    private function form(string $resource, Model $model)
    {
        $def = AdminResources::get($resource);
        $fields = AdminResources::fields($resource);
        $titles = AdminResources::relationTitles($resource, [$model]);

        return Inertia::render('Admin/Resource/Form', [
            'resource' => $this->meta($def),
            'record' => $model->exists ? [
                'id' => $model->getKey(),
                'title' => AdminResources::title($resource, $model),
                'badges' => isset($def['badges']) ? $def['badges']($model) : [],
                'links' => isset($def['links']) ? $def['links']($model) : [],
            ] : null,
            'fields' => array_values(array_map(fn ($field) => [
                ...collect($field)->except(['directory', 'unique'])->all(),
                'required' => $field['required'] || (!$model->exists && ($field['required_on_create'] ?? false)),
                'value' => AdminResources::formValue($field, $model),
                'display' => $field['type'] === 'relation' || $field['type'] === 'image' ? AdminResources::displayValue($field, $model, $titles) : null,
            ], $fields)),
            'children' => $model->exists ? array_map(fn ($child) => [
                ...$child,
                'count' => AdminResources::model($child['resource'])->newQuery()->where($child['field'], $model->getKey())->count(),
                'icon' => AdminResources::get($child['resource'])['icon'],
            ], AdminResources::children($resource)) : [],
        ]);
    }

    private function save(Request $request, string $resource, Model $model): void
    {
        $fields = array_filter(AdminResources::fields($resource), fn ($field) => !$field['readonly']);
        $request->validate(collect($fields)->mapWithKeys(fn ($field) => [$field['name'] => $this->rules($field, $model)])->all());

        foreach ($fields as $name => $field) {
            $value = $request->input($name);

            switch ($field['type']) {
                case 'password':
                    if (filled($value)) {
                        $model->setAttribute($name, $value);
                    }
                    break;
                case 'boolean':
                    $model->setAttribute($name, $request->boolean($name));
                    break;
                case 'image':
                    if ($request->hasFile($name)) {
                        $old = $model->getAttributes()[$name] ?? null;
                        $directory = isset($field['directory']) ? $field['directory']($model) : 'admin';
                        $model->setAttribute($name, $request->file($name)->store($directory, 'public'));
                        if ($old && !str_starts_with($old, 'http')) {
                            Storage::disk('public')->delete($old);
                        }
                    }
                    break;
                case 'json':
                    $decoded = blank($value) ? null : json_decode($value, true);
                    $model->setAttribute($name, $decoded === null || $model->hasCast($name) ? $decoded : json_encode($decoded, JSON_UNESCAPED_UNICODE));
                    break;
                case 'datetime':
                    $model->setAttribute($name, blank($value) ? null : Carbon::parse($value));
                    break;
                default:
                    $model->setAttribute($name, $value === '' ? null : $value);
            }
        }

        $model->save();
    }

    private function rules(array $field, Model $model): array
    {
        $required = $field['required'] || (!$model->exists && ($field['required_on_create'] ?? false));
        // Une image déjà enregistrée n'a pas à être renvoyée à chaque modification.
        if ($field['type'] === 'image' && $model->exists && filled($model->getAttributes()[$field['name']] ?? null)) {
            $required = false;
        }
        $rules = [$required ? 'required' : 'nullable'];

        $rules = [...$rules, ...match ($field['type']) {
            'integer' => ['integer'],
            'decimal' => ['numeric'],
            'boolean' => ['boolean'],
            'date', 'datetime' => ['date'],
            'time' => ['date_format:H:i,H:i:s'],
            'json' => ['json'],
            'email' => ['email', 'max:' . ($field['max'] ?? 191)],
            'url' => ['string', 'max:' . ($field['max'] ?? 2048)],
            'select' => [Rule::in(array_map('strval', array_keys($field['options'])))],
            'relation' => ['integer', Rule::exists(AdminResources::model($field['resource'])->getTable(), 'id')],
            'image' => ['image', 'mimes:jpg,jpeg,png,webp,gif', 'max:10240'],
            'password' => ['string', 'min:8', 'max:191'],
            'textarea' => ['string'],
            default => ['string', 'max:' . ($field['max'] ?? 65535)],
        }];

        if ($field['unique'] ?? false) {
            $rules[] = Rule::unique($model->getTable(), $field['name'])->ignore($model->getKey());
        }

        return $rules;
    }

    private function find(string $resource, string $id): Model
    {
        return AdminResources::model($resource)->newQuery()->findOrFail($id);
    }

    private function meta(array $def): array
    {
        return [
            'key' => $def['key'],
            'label' => $def['label'],
            'singular' => $def['singular'],
            'icon' => $def['icon'],
            'group' => $def['group'],
            'toggles' => $def['toggles'] ?? [],
            'searchable' => !empty($def['search']),
        ];
    }
}
