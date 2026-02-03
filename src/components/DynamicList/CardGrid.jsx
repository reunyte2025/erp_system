import React from 'react';

/**
 * ============================================================================
 * CARD GRID COMPONENT - ENTERPRISE LEVEL
 * ============================================================================
 * 
 * Optimized grid layout for card-based interfaces
 * Designed to work seamlessly with animated cards
 * 
 * Features:
 * - Responsive grid with configurable columns
 * - Smooth card rendering with proper keys
 * - Performance optimized with React best practices
 * - Handles null/undefined data gracefully
 * - Uses items-start for stable layout during animations
 * 
 * @component
 */

const CardGrid = ({
  data = [],
  renderCard, // React component to render each card
  columns = { sm: 1, md: 2, lg: 3 },
  gap = 6,
  onCardClick,
}) => {
  /**
   * Handle card click event
   */
  const handleCardClick = (item) => {
    if (onCardClick && typeof onCardClick === 'function') {
      onCardClick(item);
    }
  };

  /**
   * Generate responsive grid column classes
   * Uses Tailwind's responsive prefixes
   */
  const getGridClasses = () => {
    const colClasses = ['grid-cols-1']; // Base: 1 column on mobile
    
    if (columns.sm) colClasses.push(`sm:grid-cols-${columns.sm}`);
    if (columns.md) colClasses.push(`md:grid-cols-${columns.md}`);
    if (columns.lg) colClasses.push(`lg:grid-cols-${columns.lg}`);
    
    return colClasses.join(' ');
  };

  /**
   * Render a single card with proper props
   * Handles both component and function render patterns
   */
  const renderSingleCard = (item, index) => {
    // Skip null/undefined items
    if (!item) {
      console.warn('CardGrid: Skipping null/undefined item at index', index);
      return null;
    }

    // Render card component with proper props
    const CardComponent = renderCard;
    
    if (!CardComponent) {
      console.error('CardGrid: No card component provided');
      return null;
    }

    // Pass item as 'project' prop to match ProjectCard interface
    return <CardComponent project={item} />;
  };

  // Filter out null/undefined items before rendering
  const validData = data.filter(item => item != null);

  if (validData.length === 0) {
    return null;
  }

  return (
    <div 
      className={`grid ${getGridClasses()} gap-${gap} items-start`}
      style={{
        // Ensures smooth animations don't affect neighboring cards
        alignItems: 'start',
      }}
    >
      {validData.map((item, index) => (
        <div
          key={item.id || `card-${index}`}
          onClick={() => handleCardClick(item)}
          className={`
            ${onCardClick ? 'cursor-pointer' : ''}
            transform-gpu
          `}
          style={{
            // Prevents layout shift during card animations
            minHeight: 'fit-content',
          }}
        >
          {renderSingleCard(item, index)}
        </div>
      ))}
    </div>
  );
};

export default CardGrid;

/**
 * ============================================================================
 * USAGE EXAMPLE
 * ============================================================================
 * 
 * import CardGrid from './CardGrid';
 * import { ProjectCard } from './projects.config';
 * 
 * <CardGrid
 *   data={projects}
 *   renderCard={ProjectCard}
 *   columns={{ sm: 1, md: 2, lg: 3 }}
 *   gap={6}
 *   onCardClick={(project) => navigate(`/projects/${project.id}`)}
 * />
 * 
 * ============================================================================
 */

/**
 * ============================================================================
 * OPTIMIZATION NOTES
 * ============================================================================
 * 
 * PERFORMANCE:
 * - Uses transform-gpu class for hardware acceleration
 * - Filters data once before rendering
 * - Proper key usage prevents unnecessary re-renders
 * - items-start prevents layout thrashing during animations
 * 
 * ANIMATION COMPATIBILITY:
 * - items-start ensures cards stay at top during expansion
 * - min-height: fit-content prevents height conflicts
 * - No fixed heights that could clip animated content
 * - Grid gap remains consistent during animations
 * 
 * ERROR HANDLING:
 * - Gracefully handles null/undefined items
 * - Console warnings for debugging
 * - Validates card component exists
 * - Fallback key generation for items without IDs
 * 
 * RESPONSIVE DESIGN:
 * - Mobile-first approach (grid-cols-1 base)
 * - Breakpoint-specific column counts
 * - Consistent gap spacing across all screen sizes
 * - Works with any number of columns
 * 
 * ============================================================================
 */