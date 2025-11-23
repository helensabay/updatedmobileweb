// src/components/menu/CategoryTabs.jsx
import React, { useEffect, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Button } from '@/components/ui/button';
import { Archive, LayoutGrid, List, Loader2, RotateCcw } from 'lucide-react';
import ItemGrid from './ItemGrid';
import ItemList from './ItemList';

const CategoryTabs = ({
  items = [],
  categories = [],
  onEdit = () => {},
  onArchive = () => {},
  archivedItems = [],
  archivedLoading = false,
  onRestore = () => {},
}) => {
  const [view, setView] = useState('grid');
  const [activeTab, setActiveTab] = useState('all');
  const showArchived = activeTab === 'archived';
  const tabTriggerClasses =
    'min-w-fit whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground sm:text-sm';

  useEffect(() => {
    if (showArchived) setView('list');
  }, [showArchived]);

  const renderItems = (list) =>
    view === 'grid' ? (
      <ItemGrid items={list} onEdit={onEdit} onArchive={onArchive} />
    ) : (
      <ItemList items={list} onEdit={onEdit} onArchive={onArchive} />
    );

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <TabsList
          className={`${
            showArchived ? 'hidden md:flex md:opacity-60' : 'flex'
          } h-auto w-full justify-start gap-1 overflow-x-auto rounded-lg border border-border/40 bg-background/80 p-1 shadow-sm sm:gap-2`}
        >
          <TabsTrigger value="all" className={tabTriggerClasses}>
            All Items
          </TabsTrigger>
          {categories.map((category) => (
            <TabsTrigger
              key={category}
              value={category}
              className={tabTriggerClasses}
            >
              {category}
            </TabsTrigger>
          ))}
          <TabsTrigger value="archived" className="hidden">
            Archived
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2 self-end md:self-auto">
          <div
            className={
              showArchived ? 'pointer-events-none opacity-40' : undefined
            }
          >
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(v) => v && setView(v)}
              variant="outline"
              size="sm"
              aria-label="View mode"
            >
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
          <Button
            variant={showArchived ? 'default' : 'outline'}
            size="icon"
            onClick={() =>
              setActiveTab((prev) => (prev === 'archived' ? 'all' : 'archived'))
            }
            aria-pressed={showArchived}
            aria-label={
              showArchived
                ? 'Show active menu items'
                : 'Show archived menu items'
            }
          >
            <Archive className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {!showArchived && (
        <>
          <TabsContent value="all" className="mt-6">
            {view === 'grid' ? (
              <ItemGrid
                items={items}
                onEdit={onEdit}
                onArchive={onArchive}
                showCategory
              />
            ) : (
              <ItemList
                items={items}
                onEdit={onEdit}
                onArchive={onArchive}
                showCategory
              />
            )}
          </TabsContent>

          {categories.map((category) => (
            <TabsContent key={category} value={category} className="mt-6">
              {renderItems(items.filter((i) => i.category === category))}
            </TabsContent>
          ))}
        </>
      )}

      <TabsContent value="archived" className="mt-6 space-y-4">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-semibold">Archived Items</h3>
            <p className="text-sm text-muted-foreground">
              Restore menu items to make them available again.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveTab('all')}
            className="self-start md:self-auto"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Back to Active Items
          </Button>
        </div>
        {archivedLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : archivedItems && archivedItems.length > 0 ? (
          <ItemList
            items={archivedItems}
            onEdit={onEdit}
            mode="archived"
            onRestore={onRestore}
          />
        ) : (
          <div className="rounded-md border border-dashed border-muted-foreground/40 p-8 text-center text-sm text-muted-foreground">
            No archived menu items yet.
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
};

export default CategoryTabs;
